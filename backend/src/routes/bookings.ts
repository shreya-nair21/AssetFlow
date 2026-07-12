import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /bookings - List all bookings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { resourceType, resourceName, startDate, endDate } = req.query;

    const where: any = {};
    if (resourceType) {
      where.resourceType = resourceType as string;
    }
    if (resourceName) {
      where.resourceName = resourceName as string;
    }
    if (startDate && endDate) {
      where.startDate = { lte: new Date(endDate as string) };
      where.endDate = { gte: new Date(startDate as string) };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resource bookings' });
  }
});

// POST /bookings - Create a booking with conflict overlap detection
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { resourceName, resourceType, startDate, endDate } = req.body;

    if (!resourceName || !resourceType || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing booking parameters (resourceName, resourceType, startDate, endDate)' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      res.status(400).json({ error: 'Start date/time must be before end date/time' });
      return;
    }

    // Overlap conflict detection engine:
    // Finds any booking on the same resource where:
    // booking.startDate < requested.endDate AND booking.endDate > requested.startDate AND booking.status != CANCELLED/REJECTED
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        resourceName,
        status: { in: ['APPROVED', 'PENDING'] },
        startDate: { lt: end },
        endDate: { gt: start },
      },
    });

    if (conflictingBooking) {
      res.status(409).json({
        error: 'Booking conflict detected. The requested resource is already reserved during this time slot.',
        conflict: conflictingBooking,
      });
      return;
    }

    const booking = await prisma.booking.create({
      data: {
        resourceName,
        resourceType,
        userId: req.user!.id,
        startDate: start,
        endDate: end,
        status: 'APPROVED', // Auto-approved for prototype
      },
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'BOOK_RESOURCE',
        entityName: 'Booking',
        entityId: booking.id,
        details: JSON.stringify({ resource: resourceName, start, end }),
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to reserve resource' });
  }
});

// PUT /bookings/:id/cancel - Cancel a resource booking
router.put('/:id/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Only booking owner or Admins/Asset Managers can cancel bookings
    if (booking.userId !== req.user!.id && !['ADMIN', 'ASSET_MANAGER'].includes(req.user!.role)) {
      res.status(403).json({ error: 'You are not authorized to cancel this booking' });
      return;
    }

    const cancelledBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(cancelledBooking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;
