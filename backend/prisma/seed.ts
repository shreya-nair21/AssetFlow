import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear database
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.auditCycle.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log('Database cleared.');

  // 2. Hash password
  const passwordHash = bcrypt.hashSync('password123', 10);

  // 3. Create Departments
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources', status: 'ACTIVE' },
  });

  const engDept = await prisma.department.create({
    data: { name: 'Engineering', status: 'ACTIVE' },
  });

  const opsDept = await prisma.department.create({
    data: { name: 'Operations', status: 'ACTIVE' },
  });

  const devDept = await prisma.department.create({
    data: { name: 'Software Development', status: 'ACTIVE', parentId: engDept.id },
  });

  const qaDept = await prisma.department.create({
    data: { name: 'Quality Assurance', status: 'ACTIVE', parentId: engDept.id },
  });

  console.log('Departments created.');

  // 4. Create Users (without heads first to prevent circular dependency)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@assetflow.com',
      passwordHash,
      name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      departmentId: opsDept.id,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@assetflow.com',
      passwordHash,
      name: 'Sarah Connor',
      role: 'ASSET_MANAGER',
      status: 'ACTIVE',
      departmentId: opsDept.id,
    },
  });

  const headUser = await prisma.user.create({
    data: {
      email: 'head@assetflow.com',
      passwordHash,
      name: 'John Doe',
      role: 'DEPT_HEAD',
      status: 'ACTIVE',
      departmentId: engDept.id,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      email: 'employee@assetflow.com',
      passwordHash,
      name: 'Jane Smith',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      departmentId: engDept.id,
    },
  });

  const technicianUser = await prisma.user.create({
    data: {
      email: 'tech@assetflow.com',
      passwordHash,
      name: 'Bob Builder',
      role: 'EMPLOYEE', // Standard Employee role but will be assigned as technician
      status: 'ACTIVE',
      departmentId: opsDept.id,
    },
  });

  console.log('Users created.');

  // Update Department Heads
  await prisma.department.update({
    where: { id: engDept.id },
    data: { headId: headUser.id },
  });

  await prisma.department.update({
    where: { id: hrDept.id },
    data: { headId: headUser.id }, // For simplicity, Head User manages both or one
  });

  console.log('Department heads updated.');

  // 5. Create Categories
  const laptopCategory = await prisma.category.create({
    data: {
      name: 'Laptops',
      description: 'Corporate workstation laptops and notebooks',
      dynamicFields: JSON.stringify([
        { name: 'Processor', type: 'text', required: true },
        { name: 'RAM', type: 'text', required: true },
        { name: 'Storage', type: 'text', required: true },
        { name: 'WarrantyEnd', type: 'date', required: false },
      ]),
    },
  });

  const roomCategory = await prisma.category.create({
    data: {
      name: 'Meeting Rooms',
      description: 'Shared physical meeting rooms and conference areas',
      dynamicFields: JSON.stringify([
        { name: 'Capacity', type: 'number', required: true },
        { name: 'HasProjector', type: 'boolean', required: true },
        { name: 'LayoutType', type: 'text', required: false },
      ]),
    },
  });

  const vehicleCategory = await prisma.category.create({
    data: {
      name: 'Vehicles',
      description: 'Company-owned transport vehicles and logistics cars',
      dynamicFields: JSON.stringify([
        { name: 'LicensePlate', type: 'text', required: true },
        { name: 'FuelType', type: 'text', required: true },
        { name: 'LastServiceDate', type: 'date', required: false },
      ]),
    },
  });

  console.log('Categories created.');

  // 6. Create Assets
  const laptop1 = await prisma.asset.create({
    data: {
      name: 'MacBook Pro 16" (M3 Pro)',
      assetTag: 'AST-LPT-001',
      serialNumber: 'C02F234XMD6M',
      categoryId: laptopCategory.id,
      cost: 2499.00,
      acquisitionDate: new Date('2025-01-15'),
      condition: 'NEW',
      status: 'ALLOCATED',
      location: 'HQ - Floor 3',
      customFields: JSON.stringify({
        Processor: 'M3 Pro',
        RAM: '36GB',
        Storage: '512GB SSD',
        WarrantyEnd: '2026-01-15',
      }),
    },
  });

  const laptop2 = await prisma.asset.create({
    data: {
      name: 'ThinkPad X1 Carbon Gen 11',
      assetTag: 'AST-LPT-002',
      serialNumber: 'PF45A987',
      categoryId: laptopCategory.id,
      cost: 1899.00,
      acquisitionDate: new Date('2025-02-10'),
      condition: 'GOOD',
      status: 'AVAILABLE',
      location: 'HQ - Floor 3',
      customFields: JSON.stringify({
        Processor: 'Intel Core i7-1370P',
        RAM: '32GB',
        Storage: '1TB SSD',
        WarrantyEnd: '2027-02-10',
      }),
    },
  });

  const laptop3 = await prisma.asset.create({
    data: {
      name: 'Dell XPS 15 9530',
      assetTag: 'AST-LPT-003',
      serialNumber: '5Y8DF73',
      categoryId: laptopCategory.id,
      cost: 2199.00,
      acquisitionDate: new Date('2024-06-01'),
      condition: 'FAIR',
      status: 'UNDER_MAINTENANCE',
      location: 'HQ - Storage Room',
      customFields: JSON.stringify({
        Processor: 'Intel Core i9-13900H',
        RAM: '32GB',
        Storage: '1TB SSD',
        WarrantyEnd: '2025-06-01',
      }),
    },
  });

  const projector1 = await prisma.asset.create({
    data: {
      name: 'Epson Pro EX11000 Projector',
      assetTag: 'AST-PRJ-001',
      serialNumber: 'EP8481239',
      categoryId: roomCategory.id,
      cost: 899.00,
      acquisitionDate: new Date('2024-11-20'),
      condition: 'GOOD',
      status: 'AVAILABLE',
      location: 'HQ - Floor 2',
      isBookable: true,
      customFields: JSON.stringify({
        Capacity: 1,
        HasProjector: true,
        LayoutType: 'Portable',
      }),
    },
  });

  const room1 = await prisma.asset.create({
    data: {
      name: 'Conference Room Alpha',
      assetTag: 'AST-ROM-001',
      serialNumber: 'RM-A-101',
      categoryId: roomCategory.id,
      cost: 15000.00,
      acquisitionDate: new Date('2023-01-01'),
      condition: 'GOOD',
      status: 'AVAILABLE',
      location: 'HQ - Floor 1',
      isBookable: true,
      customFields: JSON.stringify({
        Capacity: 12,
        HasProjector: true,
        LayoutType: 'Boardroom',
      }),
    },
  });

  const car1 = await prisma.asset.create({
    data: {
      name: 'Tesla Model 3 (Logistics)',
      assetTag: 'AST-VEH-001',
      serialNumber: 'TSLA5YJ3E',
      categoryId: vehicleCategory.id,
      cost: 45000.00,
      acquisitionDate: new Date('2024-05-15'),
      condition: 'GOOD',
      status: 'AVAILABLE',
      location: 'HQ - Parking Lot A',
      isBookable: true,
      customFields: JSON.stringify({
        LicensePlate: 'TX-982-ERP',
        FuelType: 'Electric',
        LastServiceDate: '2025-12-01',
      }),
    },
  });

  console.log('Assets created.');

  // 7. Create Allocations
  await prisma.allocation.create({
    data: {
      assetId: laptop1.id,
      userId: employeeUser.id,
      allocatedById: managerUser.id,
      expectedReturnDate: new Date('2026-01-15'),
      conditionNotesOut: 'Brand new in box. Pristine condition.',
      status: 'ACTIVE',
    },
  });

  console.log('Allocations created.');

  // 8. Create Maintenance Request
  await prisma.maintenanceRequest.create({
    data: {
      assetId: laptop3.id,
      userId: employeeUser.id,
      technicianId: technicianUser.id,
      title: 'Battery swelling & overheating',
      description: 'The lower chassis of the laptop is bulging, and it gets extremely hot when running standard IDE software.',
      priority: 'HIGH',
      status: 'TECHNICIAN_ASSIGNED',
      cost: 150.00,
    },
  });

  console.log('Maintenance requests created.');

  // 9. Create Bookings (Shared Resources)
  await prisma.booking.create({
    data: {
      resourceName: 'Conference Room Alpha',
      resourceType: 'ROOM',
      userId: employeeUser.id,
      startDate: new Date('2026-07-12T10:00:00Z'),
      endDate: new Date('2026-07-12T11:30:00Z'),
      status: 'APPROVED',
    },
  });

  await prisma.booking.create({
    data: {
      resourceName: 'Tesla Model 3 (Logistics)',
      resourceType: 'VEHICLE',
      userId: headUser.id,
      startDate: new Date('2026-07-13T09:00:00Z'),
      endDate: new Date('2026-07-13T17:00:00Z'),
      status: 'APPROVED',
    },
  });

  console.log('Bookings created.');

  // 10. Create Notifications
  await prisma.notification.create({
    data: {
      userId: employeeUser.id,
      title: 'Asset Allocated',
      message: 'MacBook Pro 16" (AST-LPT-001) has been allocated to you. Expected return date is 2026-01-15.',
      type: 'SUCCESS',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      title: 'Maintenance Request Raised',
      message: 'Jane Smith raised a high priority maintenance request for Dell XPS 15 (AST-LPT-003).',
      type: 'ALERT',
      isRead: false,
    },
  });

  console.log('Notifications created.');

  // 11. Create Activity Logs
  await prisma.activityLog.create({
    data: {
      userId: managerUser.id,
      action: 'ALLOCATE_ASSET',
      entityName: 'Asset',
      entityId: laptop1.id,
      details: JSON.stringify({ employeeName: employeeUser.name, assetTag: laptop1.assetTag }),
    },
  });

  console.log('Activity logs created.');
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
