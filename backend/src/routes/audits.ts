import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /audits/cycles - Fetch all audit cycles
router.get('/cycles', authenticateToken, async (req, res) => {
  try {
    const cycles = await prisma.auditCycle.findMany({
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { auditItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit cycles' });
  }
});

// POST /audits/cycles - Create a new audit cycle and auto-generate AuditItems (ADMIN only)
router.post('/cycles', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, startDate, endDate } = req.body;

    if (!title || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing audit cycle parameters (title, startDate, endDate)' });
      return;
    }

    // 1. Fetch all assets that are not retired or disposed
    const activeAssets = await prisma.asset.findMany({
      where: {
        status: { notIn: ['RETIRED', 'DISPOSED'] },
      },
    });

    if (activeAssets.length === 0) {
      res.status(400).json({ error: 'No active assets found to run an audit cycle on.' });
      return;
    }

    // 2. Perform in transaction: Create cycle and bulk insert audit items
    const cycle = await prisma.auditCycle.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById: req.user!.id,
        status: 'ACTIVE',
      },
    });

    const auditItemsData = activeAssets.map((asset) => ({
      auditCycleId: cycle.id,
      assetId: asset.id,
      auditorId: req.user!.id, // Set the creator as initial auditor; can be changed
      status: 'PENDING',
    }));

    await prisma.auditItem.createMany({
      data: auditItemsData,
    });

    // 3. Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_AUDIT_CYCLE',
        entityName: 'AuditCycle',
        entityId: cycle.id,
        details: JSON.stringify({ title, itemCount: activeAssets.length }),
      },
    });

    res.status(201).json(cycle);
  } catch (error) {
    console.error('Create audit cycle error:', error);
    res.status(500).json({ error: 'Failed to create audit cycle' });
  }
});

// GET /audits/cycles/:id/items - List audit items for a specific cycle
router.get('/cycles/:id/items', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;

    const items = await prisma.auditItem.findMany({
      where: { auditCycleId: id },
      include: {
        asset: {
          include: { category: { select: { id: true, name: true } } },
        },
        auditor: { select: { id: true, name: true } },
      },
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit cycle items' });
  }
});

// POST /audits/items/:id/verify - Update audit verification status (auditor check-off)
router.post('/items/:id/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body; // status: VERIFIED, MISSING, DAMAGED

    if (!['VERIFIED', 'MISSING', 'DAMAGED'].includes(status)) {
      res.status(400).json({ error: 'Status must be VERIFIED, MISSING, or DAMAGED' });
      return;
    }

    const item = await prisma.auditItem.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!item) {
      res.status(404).json({ error: 'Audit item record not found' });
      return;
    }

    // Business Logic triggers:
    // If marked MISSING, update asset status to LOST.
    // If marked DAMAGED, update asset condition to POOR.
    let updatedAssetStatus = item.asset.status;
    let updatedAssetCondition = item.asset.condition;

    if (status === 'MISSING') {
      updatedAssetStatus = 'LOST';
    } else if (status === 'DAMAGED') {
      updatedAssetCondition = 'POOR';
    }

    const [updatedItem] = await prisma.$transaction([
      prisma.auditItem.update({
        where: { id },
        data: {
          status,
          notes,
          auditorId: req.user!.id,
          verifiedAt: new Date(),
        },
      }),
      prisma.asset.update({
        where: { id: item.assetId },
        data: {
          status: updatedAssetStatus,
          condition: updatedAssetCondition,
        },
      }),
    ]);

    // Create Notification if asset has issues
    if (status !== 'VERIFIED') {
      const managers = await prisma.user.findMany({
        where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
      });
      for (const manager of managers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            title: `Audit Discrepancy: ${status}`,
            message: `Asset "${item.asset.name}" (${item.asset.assetTag}) was marked as ${status} during audit.`,
            type: 'ALERT',
          },
        });
      }
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Audit verification error:', error);
    res.status(500).json({ error: 'Failed to log verification status' });
  }
});

// POST /audits/cycles/:id/close - Close an audit cycle (ADMIN only)
router.post('/cycles/:id/close', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: { auditItems: true },
    });

    if (!cycle || cycle.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Active audit cycle not found' });
      return;
    }

    // Mark as closed
    const closedCycle = await prisma.auditCycle.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    // Generate summary details for logs
    const totalCount = cycle.auditItems.length;
    const missingCount = cycle.auditItems.filter((i) => i.status === 'MISSING').length;
    const damagedCount = cycle.auditItems.filter((i) => i.status === 'DAMAGED').length;
    const verifiedCount = cycle.auditItems.filter((i) => i.status === 'VERIFIED').length;

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CLOSE_AUDIT_CYCLE',
        entityName: 'AuditCycle',
        entityId: id,
        details: JSON.stringify({
          title: cycle.title,
          totalCount,
          verifiedCount,
          missingCount,
          damagedCount,
        }),
      },
    });

    res.json(closedCycle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to close audit cycle' });
  }
});

export default router;
