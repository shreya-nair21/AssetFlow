import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /maintenance - List maintenance requests
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, assetId } = req.query;
    const where: any = {};

    if (status) {
      where.status = status as string;
    }
    if (assetId) {
      where.assetId = assetId as string;
    }

    // Standard employees only see maintenance requests they reported
    if (req.user!.role === 'EMPLOYEE') {
      where.userId = req.user!.id;
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        reporter: { select: { id: true, name: true, email: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
});

// POST /maintenance - Raise a new maintenance request (Any authenticated user)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, title, description, priority } = req.body;

    if (!assetId || !title || !description) {
      res.status(400).json({ error: 'Asset ID, title, and description are required' });
      return;
    }

    // 1. Verify asset exists
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      res.status(400).json({ error: 'Asset not found' });
      return;
    }

    // 2. Create the request
    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId,
        userId: req.user!.id,
        title,
        description,
        priority: priority || 'MEDIUM',
        status: 'PENDING',
      },
    });

    // 3. Notify Asset Managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
    });

    for (const manager of managers) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          title: 'New Maintenance Request',
          message: `${req.user!.name} requested repairs for "${asset.name}" (${asset.assetTag}).`,
          type: 'ALERT',
        },
      });
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to raise maintenance request' });
  }
});

// POST /maintenance/:id/action - Manage maintenance workflows (ASSET_MANAGER / ADMIN / TECHNICIAN assigned)
router.post('/:id/action', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, technicianId, cost } = req.body; // status: APPROVED, TECHNICIAN_ASSIGNED, IN_PROGRESS, RESOLVED

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Maintenance request not found' });
      return;
    }

    // Permissions: Only admins, asset managers, or the assigned technician can alter states
    const isAuthorized =
      ['ADMIN', 'ASSET_MANAGER'].includes(req.user!.role) ||
      (request.technicianId === req.user!.id);

    if (!isAuthorized) {
      res.status(403).json({ error: 'You are not authorized to update this maintenance record' });
      return;
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (technicianId) updateData.technicianId = technicianId;
    if (cost !== undefined) updateData.cost = parseFloat(cost);

    // Lifecycle triggers:
    // 1. If status goes to APPROVED, TECHNICIAN_ASSIGNED, or IN_PROGRESS, update Asset status to UNDER_MAINTENANCE.
    // 2. If status goes to RESOLVED, update Asset status to AVAILABLE.
    let updatedAssetStatus: string | null = null;
    if (status === 'RESOLVED') {
      updatedAssetStatus = 'AVAILABLE';
    } else if (['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'].includes(status)) {
      updatedAssetStatus = 'UNDER_MAINTENANCE';
    }

    const [updatedRequest] = await prisma.$transaction([
      prisma.maintenanceRequest.update({
        where: { id },
        data: updateData,
      }),
      ...(updatedAssetStatus
        ? [
            prisma.asset.update({
              where: { id: request.assetId },
              data: { status: updatedAssetStatus },
            }),
          ]
        : []),
    ]);

    // Send notification to the reporter
    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: 'Maintenance Status Updated',
        message: `Your request for "${request.asset.name}" has been updated to "${status}".`,
        type: status === 'RESOLVED' ? 'SUCCESS' : 'INFO',
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'MAINTENANCE_UPDATE',
        entityName: 'Asset',
        entityId: request.assetId,
        details: JSON.stringify({ ticketId: id, status, cost }),
      },
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Maintenance workflow error:', error);
    res.status(500).json({ error: 'Failed to update maintenance details' });
  }
});

export default router;
