import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /analytics - Get dashboard stats and aggregation logs for charts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // 1. Core counters
    const totalAssets = await prisma.asset.count();
    const availableAssets = await prisma.asset.count({ where: { status: 'AVAILABLE' } });
    const allocatedAssets = await prisma.asset.count({ where: { status: 'ALLOCATED' } });
    const maintenanceAssets = await prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } });
    const activeBookings = await prisma.booking.count({ where: { status: 'APPROVED', endDate: { gte: now } } });
    const pendingTransfers = await prisma.transfer.count({ where: { status: 'PENDING' } });
    
    // Overdue returns count
    const overdueReturns = await prisma.allocation.count({
      where: {
        status: 'ACTIVE',
        expectedReturnDate: { lt: now },
      },
    });

    // 2. Fetch specific list of overdue allocations for dashboards
    const overdueList = await prisma.allocation.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturnDate: { lt: now },
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      take: 10,
    });

    // 3. Department Allocation Statistics
    const departments = await prisma.department.findMany({
      include: {
        members: {
          include: {
            allocations: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    const departmentStats = departments.map((dept) => {
      let activeAllocationCount = 0;
      dept.members.forEach((m) => {
        activeAllocationCount += m.allocations.length;
      });
      return {
        name: dept.name,
        employeeCount: dept.members.length,
        allocatedAssets: activeAllocationCount,
      };
    });

    // 4. Category Breakdown
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { assets: true } },
      },
    });

    const categoryStats = categories.map((cat) => ({
      name: cat.name,
      assetCount: cat._count.assets,
    }));

    // 5. Booking heatmaps summary: Group bookings by day of the week
    const bookings = await prisma.booking.findMany({
      select: { startDate: true },
    });

    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun=0, Mon=1, etc.
    bookings.forEach((b) => {
      const day = new Date(b.startDate).getDay();
      weekdayCounts[day]++;
    });

    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bookingHeatmap = weekdayNames.map((name, index) => ({
      day: name,
      count: weekdayCounts[index],
    }));

    // 6. Recent Activity Logs (up to 15 logs)
    const recentActivity = await prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // 7. Recent Notifications for header
    const recentNotifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    res.json({
      counters: {
        totalAssets,
        availableAssets,
        allocatedAssets,
        maintenanceAssets,
        activeBookings,
        pendingTransfers,
        overdueReturns,
      },
      overdueList,
      departmentStats,
      categoryStats,
      bookingHeatmap,
      recentActivity,
      recentNotifications,
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics metrics' });
  }
});

// GET /analytics/notifications - Fetch user's notification log
router.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /analytics/notifications/read-all - Mark all notifications as read
router.post('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;
