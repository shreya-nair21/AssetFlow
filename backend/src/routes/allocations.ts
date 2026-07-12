import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// ALLOCATIONS
// ==========================================

// POST /allocations - Allocate an asset to an employee (ASSET_MANAGER / ADMIN only)
router.post('/', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, userId, expectedReturnDate, conditionNotesOut } = req.body;

    if (!assetId || !userId) {
      res.status(400).json({ error: 'Asset ID and User ID are required' });
      return;
    }

    // 1. Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === 'INACTIVE') {
      res.status(400).json({ error: 'Target user is inactive or does not exist' });
      return;
    }

    // 2. Fetch and check asset status (must be AVAILABLE)
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      res.status(400).json({ error: 'Asset not found' });
      return;
    }

    if (asset.status !== 'AVAILABLE') {
      res.status(400).json({ error: `Asset is not available for allocation. Current status: ${asset.status}` });
      return;
    }

    // 3. Create Allocation and update Asset status in transaction
    const [allocation] = await prisma.$transaction([
      prisma.allocation.create({
        data: {
          assetId,
          userId,
          allocatedById: req.user!.id,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          conditionNotesOut,
          status: 'ACTIVE',
        },
      }),
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'ALLOCATED' },
      }),
    ]);

    // 4. Send notification to the employee
    await prisma.notification.create({
      data: {
        userId,
        title: 'Asset Allocated',
        message: `Asset "${asset.name}" (${asset.assetTag}) has been allocated to you. Expected return: ${expectedReturnDate || 'N/A'}.`,
        type: 'SUCCESS',
      },
    });

    // 5. Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'ALLOCATE_ASSET',
        entityName: 'Asset',
        entityId: assetId,
        details: JSON.stringify({ allocatedTo: user.name, assetTag: asset.assetTag }),
      },
    });

    res.status(201).json(allocation);
  } catch (error) {
    console.error('Allocation error:', error);
    res.status(500).json({ error: 'Failed to allocate asset' });
  }
});

// POST /allocations/:id/return - Return an allocated asset (ASSET_MANAGER / ADMIN only)
router.post('/:id/return', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { conditionNotesIn, assetCondition } = req.body;

    const allocation = await prisma.allocation.findUnique({
      where: { id },
      include: { asset: true, user: true },
    });

    if (!allocation || allocation.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Active allocation record not found' });
      return;
    }

    // Update in transaction: close allocation, return asset status to AVAILABLE
    const [updatedAllocation] = await prisma.$transaction([
      prisma.allocation.update({
        where: { id },
        data: {
          actualReturnDate: new Date(),
          conditionNotesIn,
          status: 'RETURNED',
        },
      }),
      prisma.asset.update({
        where: { id: allocation.assetId },
        data: {
          status: 'AVAILABLE',
          condition: assetCondition || allocation.asset.condition,
        },
      }),
    ]);

    // Send notifications
    await prisma.notification.create({
      data: {
        userId: allocation.userId,
        title: 'Asset Returned',
        message: `Asset "${allocation.asset.name}" (${allocation.asset.assetTag}) return has been processed.`,
        type: 'INFO',
      },
    });

    // Log action
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'RETURN_ASSET',
        entityName: 'Asset',
        entityId: allocation.assetId,
        details: JSON.stringify({ returnedBy: allocation.user.name, assetTag: allocation.asset.assetTag }),
      },
    });

    res.json(updatedAllocation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process asset return' });
  }
});

// ==========================================
// TRANSFERS
// ==========================================

// GET /allocations/transfers - List transfer requests
router.get('/transfers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) {
      where.status = status as string;
    }

    // If standard EMPLOYEE, only show transfers they requested, or are sending/receiving
    if (req.user!.role === 'EMPLOYEE') {
      where.OR = [
        { requestedById: req.user!.id },
        { fromUserId: req.user!.id },
        { toUserId: req.user!.id },
      ];
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfer requests' });
  }
});

// POST /allocations/transfer-request - Create a transfer request (EMPLOYEE / DEPT_HEAD / MANAGER / ADMIN)
router.post('/transfer-request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, toUserId, notes } = req.body;

    if (!assetId || !toUserId) {
      res.status(400).json({ error: 'Asset ID and Recipient User ID are required' });
      return;
    }

    // 1. Verify recipient user is valid and active
    const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser || toUser.status === 'INACTIVE') {
      res.status(400).json({ error: 'Recipient employee is inactive or does not exist' });
      return;
    }

    // 2. Locate active allocation to identify sender
    const activeAllocation = await prisma.allocation.findFirst({
      where: { assetId, status: 'ACTIVE' },
    });

    if (!activeAllocation) {
      res.status(400).json({ error: 'This asset is not currently allocated to anyone' });
      return;
    }

    // If employee is requesting, verify they are the current owner of the allocation
    if (req.user!.role === 'EMPLOYEE' && activeAllocation.userId !== req.user!.id) {
      res.status(403).json({ error: 'You can only request transfers for assets currently allocated to you' });
      return;
    }

    // 3. Create the transfer request
    const transfer = await prisma.transfer.create({
      data: {
        assetId,
        fromUserId: activeAllocation.userId,
        toUserId,
        requestedById: req.user!.id,
        notes,
        status: 'PENDING',
      },
    });

    // 4. Alert Asset Manager of the pending transfer
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ASSET_MANAGER', 'ADMIN'] } },
    });

    for (const manager of managers) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          title: 'Transfer Request Submitted',
          message: `${req.user!.name} requested to transfer an asset to ${toUser.name}.`,
          type: 'INFO',
        },
      });
    }

    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transfer request' });
  }
});

// POST /allocations/transfers/:id/action - Approve/Reject transfer (ASSET_MANAGER / ADMIN / DEPT_HEAD only)
router.post('/transfers/:id/action', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action, notes } = req.body; // action: "APPROVE" | "REJECT"

    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
      return;
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { asset: true, fromUser: true, toUser: true },
    });

    if (!transfer || transfer.status !== 'PENDING') {
      res.status(400).json({ error: 'Pending transfer request not found' });
      return;
    }

    // Role-based Department Head constraint verification:
    if (req.user!.role === 'DEPT_HEAD') {
      const departments = await prisma.department.findMany({
        where: { headId: req.user!.id }
      });
      const managedDeptIds = departments.map(d => d.id);
      
      const isFromUserInDept = transfer.fromUser.departmentId && managedDeptIds.includes(transfer.fromUser.departmentId);
      const isToUserInDept = transfer.toUser.departmentId && managedDeptIds.includes(transfer.toUser.departmentId);

      if (!isFromUserInDept && !isToUserInDept) {
        res.status(403).json({ error: 'Forbidden: Department Heads can only approve transfer requests within their department' });
        return;
      }
    }

    if (action === 'REJECT') {
      const rejectedTransfer = await prisma.transfer.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: req.user!.id,
          notes: notes || transfer.notes,
        },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          userId: transfer.requestedById,
          title: 'Transfer Request Rejected',
          message: `The request to transfer "${transfer.asset.name}" to ${transfer.toUser.name} was rejected.`,
          type: 'ALERT',
        },
      });

      res.json(rejectedTransfer);
      return;
    }

    // Action: APPROVE
    // Complete the transfer workflow in a database transaction:
    // 1. Close current active allocation for sender.
    // 2. Open new allocation for receiver.
    // 3. Update transfer status to APPROVED.
    // 4. Update Asset location to matching receiver's office or HQ if applicable.
    const activeAllocation = await prisma.allocation.findFirst({
      where: { assetId: transfer.assetId, status: 'ACTIVE' },
    });

    const closedDate = new Date();

    const [approvedTransfer] = await prisma.$transaction([
      prisma.transfer.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: req.user!.id,
        },
      }),
      // Close old allocation if it exists
      ...(activeAllocation
        ? [
            prisma.allocation.update({
              where: { id: activeAllocation.id },
              data: {
                actualReturnDate: closedDate,
                status: 'RETURNED',
                conditionNotesIn: 'Returned via transfer approval.',
              },
            }),
          ]
        : []),
      // Create new allocation
      prisma.allocation.create({
        data: {
          assetId: transfer.assetId,
          userId: transfer.toUserId,
          allocatedById: req.user!.id,
          conditionNotesOut: 'Transferred from ' + transfer.fromUser.name,
          status: 'ACTIVE',
        },
      }),
    ]);

    // Send notifications to sender & receiver
    await prisma.notification.create({
      data: {
        userId: transfer.fromUserId,
        title: 'Asset Transferred Out',
        message: `Asset "${transfer.asset.name}" allocated to you has been successfully transferred to ${transfer.toUser.name}.`,
        type: 'INFO',
      },
    });

    await prisma.notification.create({
      data: {
        userId: transfer.toUserId,
        title: 'Asset Transferred In',
        message: `Asset "${transfer.asset.name}" has been transferred to you from ${transfer.fromUser.name}.`,
        type: 'SUCCESS',
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'TRANSFER_ASSET',
        entityName: 'Asset',
        entityId: transfer.assetId,
        details: JSON.stringify({
          from: transfer.fromUser.name,
          to: transfer.toUser.name,
          assetTag: transfer.asset.assetTag,
        }),
      },
    });

    res.json(approvedTransfer);
  } catch (error) {
    console.error('Transfer process error:', error);
    res.status(500).json({ error: 'Failed to process transfer' });
  }
});

export default router;
