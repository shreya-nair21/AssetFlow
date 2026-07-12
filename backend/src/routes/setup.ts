import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// DEPARTMENTS
// ==========================================

// GET /setup/departments - List all departments
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head: { select: { id: true, name: true, email: true } },
        parentDepartment: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /setup/departments - Create a department (ADMIN only)
router.post('/departments', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { name, headId, parentId } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Department name is required' });
      return;
    }

    const dept = await prisma.department.create({
      data: {
        name,
        headId: headId || null,
        parentId: parentId || null,
        status: 'ACTIVE',
      },
    });

    res.status(201).json(dept);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Department name must be unique' });
      return;
    }
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT /setup/departments/:id - Update department head or status (ADMIN only)
router.put('/departments/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { name, headId, status, parentId } = req.body;

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name,
        headId,
        parentId: parentId || null,
        status,
      },
    });

    res.json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// ==========================================
// CATEGORIES
// ==========================================

// GET /setup/categories - List all asset categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { assets: true } },
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /setup/categories - Create new category with custom dynamicFields (ADMIN only)
router.post('/categories', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { name, description, dynamicFields } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    // Verify dynamicFields is a JSON array string or valid structure
    let fieldsString = '[]';
    if (dynamicFields) {
      fieldsString = typeof dynamicFields === 'string' ? dynamicFields : JSON.stringify(dynamicFields);
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        dynamicFields: fieldsString,
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Category name must be unique' });
      return;
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==========================================
// EMPLOYEES & DIRECTORY
// ==========================================

// GET /setup/employees - Fetch directory of employees
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// PUT /setup/employees/:id/role - Update user role (ADMIN only)
router.put('/employees/:id/role', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE'].includes(role)) {
      res.status(400).json({ error: 'Invalid role specified' });
      return;
    }

    // Prevent self role downgrade
    if (req.user?.id === id) {
      res.status(400).json({ error: 'Cannot change your own role' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CHANGE_USER_ROLE',
        entityName: 'User',
        entityId: id,
        details: JSON.stringify({ updatedUser: updatedUser.name, newRole: role }),
      },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee role' });
  }
});

// PUT /setup/employees/:id/department - Assign employee to department (ADMIN/ASSET_MANAGER only)
router.put('/employees/:id/department', authenticateToken, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { departmentId } = req.body;

    // Verify department if not null
    if (departmentId) {
      const deptExists = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!deptExists) {
        res.status(400).json({ error: 'Selected department does not exist' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { departmentId: departmentId || null },
      select: { id: true, name: true, email: true, departmentId: true },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee department' });
  }
});

export default router;
