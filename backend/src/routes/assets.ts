import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /assets - Fetch and filter all assets with search and pagination
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoryId, status, condition, isBookable, page = '1', limit = '100' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Filters
    const whereClause: any = {};

    // Apply role-based visibility constraints
    if (req.user!.role === 'EMPLOYEE') {
      whereClause.allocations = {
        some: {
          userId: req.user!.id,
          status: 'ACTIVE',
        }
      };
    } else if (req.user!.role === 'DEPT_HEAD') {
      // Find the department where the user is head
      const department = await prisma.department.findFirst({
        where: { headId: req.user!.id }
      });
      if (department) {
        whereClause.allocations = {
          some: {
            user: { departmentId: department.id },
            status: 'ACTIVE',
          }
        };
      } else {
        // If they are head of nothing, return empty list
        whereClause.id = 'none';
      }
    }

    if (isBookable !== undefined) {
      whereClause.isBookable = isBookable === 'true';
    }

    if (categoryId) {
      whereClause.categoryId = categoryId as string;
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (condition) {
      whereClause.condition = condition as string;
    }

    if (search) {
      const searchStr = search as string;
      whereClause.OR = [
        { name: { contains: searchStr } },
        { assetTag: { contains: searchStr } },
        { serialNumber: { contains: searchStr } },
        { location: { contains: searchStr } },
      ];
    }

    const [assets, totalCount] = await prisma.$transaction([
      prisma.asset.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true } },
          allocations: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.asset.count({ where: whereClause }),
    ]);

    res.json({
      assets,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    console.error('Fetch assets error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /assets/:id - Fetch single asset details and full lifecycle history
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        allocations: {
          include: {
            user: { select: { id: true, name: true, email: true, departmentId: true } },
            allocatedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        maintenanceRequests: {
          include: {
            reporter: { select: { id: true, name: true } },
            technician: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        transfers: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
            requestedBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditItems: {
          include: {
            auditCycle: { select: { id: true, title: true } },
            auditor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    // Role-based visibility enforcement for single details:
    if (req.user!.role === 'EMPLOYEE') {
      const isMyAsset = asset.allocations.some(a => a.userId === req.user!.id && a.status === 'ACTIVE');
      if (!isMyAsset) {
        res.status(403).json({ error: 'Forbidden: You are only allowed to view assets allocated to you.' });
        return;
      }
    } else if (req.user!.role === 'DEPT_HEAD') {
      // Find the department where the user is head
      const department = await prisma.department.findFirst({
        where: { headId: req.user!.id }
      });
      if (!department) {
        res.status(403).json({ error: 'Forbidden: You are only allowed to view assets allocated to your department.' });
        return;
      }
      const isDeptAsset = asset.allocations.some(a => a.user.departmentId === department.id && a.status === 'ACTIVE');
      if (!isDeptAsset) {
        res.status(403).json({ error: 'Forbidden: You are only allowed to view assets allocated to your department.' });
        return;
      }
    }

    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch asset details' });
  }
});

// POST /assets - Register new asset (ASSET_MANAGER / ADMIN only)
router.post('/', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, assetTag, serialNumber, categoryId, cost, acquisitionDate, condition, location, customFields, isBookable } = req.body;

    if (!name || !assetTag || !categoryId || cost === undefined || !acquisitionDate || !location) {
      res.status(400).json({ error: 'Missing required asset fields (name, assetTag, categoryId, cost, acquisitionDate, location)' });
      return;
    }

    // Verify category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(400).json({ error: 'Selected asset category does not exist' });
      return;
    }

    // Ensure asset tag is unique
    const existingTag = await prisma.asset.findUnique({ where: { assetTag } });
    if (existingTag) {
      res.status(400).json({ error: 'An asset with this asset tag already exists' });
      return;
    }

    // Process custom fields matching category layout
    const customFieldsString = customFields ? (typeof customFields === 'string' ? customFields : JSON.stringify(customFields)) : '{}';

    // Mock QR Code link setup
    const qrCodeMock = `ASTQR-${assetTag}-${Date.now()}`;

    const newAsset = await prisma.asset.create({
      data: {
        name,
        assetTag,
        serialNumber: serialNumber || null,
        categoryId,
        cost: parseFloat(cost),
        acquisitionDate: new Date(acquisitionDate),
        condition: condition || 'GOOD',
        status: 'AVAILABLE',
        location,
        qrCode: qrCodeMock,
        customFields: customFieldsString,
        isBookable: isBookable === true || isBookable === 'true',
      },
    });

    // Write audit activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'REGISTER_ASSET',
        entityName: 'Asset',
        entityId: newAsset.id,
        details: JSON.stringify({ assetTag: newAsset.assetTag, name: newAsset.name }),
      },
    });

    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Failed to register asset' });
  }
});

// PUT /assets/:id - Update asset specs (ASSET_MANAGER / ADMIN only)
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, serialNumber, cost, acquisitionDate, condition, status, location, customFields, isBookable } = req.body;

    const currentAsset = await prisma.asset.findUnique({ where: { id } });
    if (!currentAsset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (cost !== undefined) updateData.cost = parseFloat(cost);
    if (acquisitionDate !== undefined) updateData.acquisitionDate = new Date(acquisitionDate);
    if (condition !== undefined) updateData.condition = condition;
    if (status !== undefined) updateData.status = status;
    if (location !== undefined) updateData.location = location;
    if (customFields !== undefined) {
      updateData.customFields = typeof customFields === 'string' ? customFields : JSON.stringify(customFields);
    }
    if (isBookable !== undefined) {
      updateData.isBookable = isBookable === true || isBookable === 'true';
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: updateData,
    });

    // Log update action
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_ASSET',
        entityName: 'Asset',
        entityId: id,
        details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
      },
    });

    res.json(updatedAsset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset specifications' });
  }
});

// DELETE /assets/:id - Delete or retire asset (ADMIN / ASSET_MANAGER only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if asset exists and verify if it's currently allocated
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        allocations: { where: { status: 'ACTIVE' } },
      },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    if (asset.allocations.length > 0) {
      res.status(400).json({ error: 'Cannot delete/retire an asset that is currently allocated' });
      return;
    }

    // Soft delete / Status update to RETIRED
    const retiredAsset = await prisma.asset.update({
      where: { id },
      data: { status: 'RETIRED' },
    });

    // Log retirement action
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'RETIRE_ASSET',
        entityName: 'Asset',
        entityId: id,
        details: JSON.stringify({ assetTag: retiredAsset.assetTag }),
      },
    });

    res.json({ message: 'Asset retired successfully', asset: retiredAsset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retire asset' });
  }
});

export default router;
