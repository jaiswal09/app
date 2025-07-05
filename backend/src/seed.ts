import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateUniqueQRCode } from './utils/qrcode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.billPayment.deleteMany();
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.lowStockAlert.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@medical.com',
      password: adminPassword,
    }
  });

  const adminProfile = await prisma.userProfile.create({
    data: {
      userId: adminUser.id,
      email: 'admin@medical.com',
      fullName: 'Dr. Sarah Johnson',
      role: 'admin',
      department: 'Administration',
      phoneNumber: '+1-555-0101',
      isActive: true,
    }
  });

  // Create staff user
  console.log('👨‍⚕️ Creating staff user...');
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@medical.com',
      password: staffPassword,
    }
  });

  const staffProfile = await prisma.userProfile.create({
    data: {
      userId: staffUser.id,
      email: 'staff@medical.com',
      fullName: 'Mike Rodriguez',
      role: 'staff',
      department: 'Inventory Management',
      phoneNumber: '+1-555-0102',
      isActive: true,
    }
  });

  // Create medical personnel user
  console.log('👩‍⚕️ Creating medical personnel user...');
  const medicalPassword = await bcrypt.hash('medical123', 12);
  const medicalUser = await prisma.user.create({
    data: {
      email: 'medical@medical.com',
      password: medicalPassword,
    }
  });

  const medicalProfile = await prisma.userProfile.create({
    data: {
      userId: medicalUser.id,
      email: 'medical@medical.com',
      fullName: 'Dr. Emily Chen',
      role: 'medical_personnel',
      department: 'Emergency Medicine',
      phoneNumber: '+1-555-0103',
      isActive: true,
    }
  });

  // Create categories
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Medical Equipment',
        description: 'Large medical devices and equipment',
        color: '#3B82F6',
        icon: 'Activity',
        createdBy: adminProfile.id,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Surgical Supplies',
        description: 'Surgical instruments and supplies',
        color: '#EF4444',
        icon: 'Scissors',
        createdBy: adminProfile.id,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Medications',
        description: 'Pharmaceutical drugs and medications',
        color: '#10B981',
        icon: 'Pill',
        createdBy: adminProfile.id,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Consumables',
        description: 'Single-use items and consumables',
        color: '#F59E0B',
        icon: 'Package',
        createdBy: adminProfile.id,
      }
    }),
    prisma.category.create({
      data: {
        name: 'Diagnostic Equipment',
        description: 'Equipment for medical diagnostics',
        color: '#8B5CF6',
        icon: 'Search',
        createdBy: adminProfile.id,
      }
    }),
  ]);

  // Generate QR codes for inventory items
  const existingQRCodes: string[] = [];

  // Create inventory items
  console.log('📦 Creating inventory items...');
  const inventoryItems = [];

  // Medical Equipment
  for (const item of [
    {
      name: 'X-Ray Machine',
      description: 'Digital X-Ray imaging system',
      itemType: 'equipment',
      quantity: 2,
      minQuantity: 1,
      unitPrice: 45000,
      location: 'Radiology Department',
      manufacturer: 'GE Healthcare',
      model: 'Discovery XR656',
      serialNumber: 'GE-XR-001',
    },
    {
      name: 'MRI Scanner',
      description: '1.5T MRI scanner for detailed imaging',
      itemType: 'equipment',
      quantity: 1,
      minQuantity: 1,
      unitPrice: 150000,
      location: 'Imaging Center',
      manufacturer: 'Siemens',
      model: 'MAGNETOM Essenza',
      serialNumber: 'SIE-MRI-001',
    },
    {
      name: 'Ventilator',
      description: 'Mechanical ventilator for respiratory support',
      itemType: 'equipment',
      quantity: 15,
      minQuantity: 5,
      unitPrice: 25000,
      location: 'ICU',
      manufacturer: 'Medtronic',
      model: 'PB980',
      serialNumber: 'MDT-VNT-001',
    },
    {
      name: 'Defibrillator',
      description: 'Automated external defibrillator',
      itemType: 'equipment',
      quantity: 8,
      minQuantity: 3,
      unitPrice: 3500,
      location: 'Emergency Department',
      manufacturer: 'Philips',
      model: 'HeartStart FR3',
      serialNumber: 'PHL-DEF-001',
    },
  ]) {
    const qrCode = await generateUniqueQRCode(existingQRCodes);
    existingQRCodes.push(qrCode);

    inventoryItems.push(await prisma.inventoryItem.create({
      data: {
        ...item,
        categoryId: categories[0].id,
        qrCode,
        createdBy: staffProfile.id,
        purchaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        warrantyExpiry: new Date(Date.now() + Math.random() * 1095 * 24 * 60 * 60 * 1000),
      }
    }));
  }

  // Surgical Supplies
  for (const item of [
    {
      name: 'Surgical Scalpels',
      description: 'Sterile disposable scalpels',
      itemType: 'supplies',
      quantity: 500,
      minQuantity: 100,
      unitPrice: 2.5,
      location: 'Operating Room Storage',
      manufacturer: 'BD',
      model: 'SafetyGlide',
    },
    {
      name: 'Surgical Sutures',
      description: 'Non-absorbable sutures, various sizes',
      itemType: 'supplies',
      quantity: 200,
      minQuantity: 50,
      unitPrice: 8.75,
      location: 'Surgery Department',
      manufacturer: 'Ethicon',
      model: 'PROLENE',
    },
    {
      name: 'Surgical Masks',
      description: 'Level 3 surgical masks',
      itemType: 'supplies',
      quantity: 1000,
      minQuantity: 200,
      unitPrice: 0.85,
      location: 'Central Supply',
      manufacturer: '3M',
      model: '1826',
    },
  ]) {
    const qrCode = await generateUniqueQRCode(existingQRCodes);
    existingQRCodes.push(qrCode);

    inventoryItems.push(await prisma.inventoryItem.create({
      data: {
        ...item,
        categoryId: categories[1].id,
        qrCode,
        createdBy: staffProfile.id,
      }
    }));
  }

  // Medications
  for (const item of [
    {
      name: 'Amoxicillin 500mg',
      description: 'Antibiotic tablets',
      itemType: 'medications',
      quantity: 800,
      minQuantity: 200,
      unitPrice: 0.45,
      location: 'Pharmacy',
      manufacturer: 'Pfizer',
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Morphine 10mg/ml',
      description: 'Injectable pain medication',
      itemType: 'medications',
      quantity: 150,
      minQuantity: 50,
      unitPrice: 12.30,
      location: 'Controlled Substances Vault',
      manufacturer: 'Hospira',
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Ibuprofen 400mg',
      description: 'Anti-inflammatory tablets',
      itemType: 'medications',
      quantity: 1200,
      minQuantity: 300,
      unitPrice: 0.25,
      location: 'Pharmacy',
      manufacturer: 'Generic Pharma',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  ]) {
    const qrCode = await generateUniqueQRCode(existingQRCodes);
    existingQRCodes.push(qrCode);

    inventoryItems.push(await prisma.inventoryItem.create({
      data: {
        ...item,
        categoryId: categories[2].id,
        qrCode,
        createdBy: staffProfile.id,
      }
    }));
  }

  // Consumables
  for (const item of [
    {
      name: 'Disposable Syringes',
      description: '5ml disposable syringes',
      itemType: 'consumables',
      quantity: 2000,
      minQuantity: 500,
      unitPrice: 0.35,
      location: 'Central Supply',
      manufacturer: 'BD',
    },
    {
      name: 'Latex Gloves',
      description: 'Sterile latex examination gloves',
      itemType: 'consumables',
      quantity: 50,
      minQuantity: 200,
      unitPrice: 12.50,
      location: 'Central Supply',
      manufacturer: 'Ansell',
    },
    {
      name: 'Gauze Pads',
      description: 'Sterile gauze pads 4x4 inches',
      itemType: 'consumables',
      quantity: 800,
      minQuantity: 200,
      unitPrice: 0.75,
      location: 'Nursing Stations',
      manufacturer: 'Johnson & Johnson',
    },
  ]) {
    const qrCode = await generateUniqueQRCode(existingQRCodes);
    existingQRCodes.push(qrCode);

    inventoryItems.push(await prisma.inventoryItem.create({
      data: {
        ...item,
        categoryId: categories[3].id,
        qrCode,
        createdBy: staffProfile.id,
      }
    }));
  }

  // Create sample transactions
  console.log('📝 Creating sample transactions...');
  const transactions = [];

  // Create some checkout transactions
  for (let i = 0; i < 10; i++) {
    const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
    const quantity = Math.min(Math.floor(Math.random() * 5) + 1, randomItem.quantity);
    
    const transaction = await prisma.transaction.create({
      data: {
        itemId: randomItem.id,
        userId: Math.random() > 0.5 ? medicalProfile.id : staffProfile.id,
        transactionType: 'checkout',
        quantity,
        dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000),
        status: 'active',
        notes: `Checkout for patient care - Room ${Math.floor(Math.random() * 300) + 100}`,
        locationUsed: `Room ${Math.floor(Math.random() * 300) + 100}`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      }
    });

    transactions.push(transaction);

    // Update inventory quantity
    await prisma.inventoryItem.update({
      where: { id: randomItem.id },
      data: { quantity: { decrement: quantity } }
    });
  }

  // Create some completed transactions
  for (let i = 0; i < 5; i++) {
    const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    
    await prisma.transaction.create({
      data: {
        itemId: randomItem.id,
        userId: medicalProfile.id,
        transactionType: 'checkin',
        quantity,
        status: 'completed',
        returnedDate: new Date(),
        conditionOnReturn: 'Good condition',
        notes: 'Returned after procedure completion',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      }
    });

    // Update inventory quantity
    await prisma.inventoryItem.update({
      where: { id: randomItem.id },
      data: { quantity: { increment: quantity } }
    });
  }

  // Create maintenance schedules
  console.log('🔧 Creating maintenance schedules...');
  const equipmentItems = inventoryItems.filter(item => item.itemType === 'equipment');

  for (let i = 0; i < 5; i++) {
    const randomEquipment = equipmentItems[Math.floor(Math.random() * equipmentItems.length)];
    
    await prisma.maintenanceSchedule.create({
      data: {
        itemId: randomEquipment.id,
        maintenanceType: ['preventive', 'corrective', 'calibration', 'inspection'][Math.floor(Math.random() * 4)] as any,
        scheduledDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000),
        technicianId: staffProfile.id,
        description: `Routine maintenance for ${randomEquipment.name}`,
        status: 'scheduled',
        createdBy: adminProfile.id,
      }
    });
  }

  // Create some completed maintenance
  for (let i = 0; i < 3; i++) {
    const randomEquipment = equipmentItems[Math.floor(Math.random() * equipmentItems.length)];
    
    await prisma.maintenanceSchedule.create({
      data: {
        itemId: randomEquipment.id,
        maintenanceType: 'preventive',
        scheduledDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        technicianId: staffProfile.id,
        description: `Completed preventive maintenance for ${randomEquipment.name}`,
        status: 'completed',
        cost: Math.random() * 500 + 100,
        notes: 'Maintenance completed successfully. All systems functioning normally.',
        createdBy: adminProfile.id,
      }
    });
  }

  // Create low stock alerts for items with low quantity
  console.log('⚠️  Creating low stock alerts...');
  const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minQuantity);

  for (const item of lowStockItems) {
    const alertLevel = item.quantity === 0 ? 'out_of_stock' :
                     item.quantity <= item.minQuantity * 0.5 ? 'critical' : 'low';

    await prisma.lowStockAlert.create({
      data: {
        itemId: item.id,
        currentQuantity: item.quantity,
        minQuantity: item.minQuantity,
        alertLevel,
        status: 'active',
      }
    });
  }

  // Create sample bills
  console.log('💰 Creating sample bills...');
  for (let i = 0; i < 3; i++) {
    const billNumber = `BILL-${String(i + 1).padStart(6, '0')}`;
    
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        customerName: ['Metro General Hospital', 'City Medical Center', 'Regional Health System'][i],
        customerEmail: ['billing@metro.com', 'accounts@citymed.com', 'finance@regional.com'][i],
        customerPhone: '+1-555-0200',
        billDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 1000 + Math.random() * 5000,
        taxRate: 8.5,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        status: 'sent',
        paymentStatus: 'pending',
        createdBy: adminProfile.id,
      }
    });

    // Calculate totals
    const taxAmount = (bill.subtotal * bill.taxRate) / 100;
    const totalAmount = bill.subtotal + taxAmount - bill.discountAmount;

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        taxAmount,
        totalAmount,
      }
    });

    // Create bill items
    await prisma.billItem.createMany({
      data: [
        {
          billId: bill.id,
          itemName: 'Medical Equipment Rental',
          itemDescription: 'Monthly equipment rental fee',
          quantity: 1,
          unitPrice: bill.subtotal * 0.6,
          totalPrice: bill.subtotal * 0.6,
        },
        {
          billId: bill.id,
          itemName: 'Maintenance Service',
          itemDescription: 'Preventive maintenance service',
          quantity: 1,
          unitPrice: bill.subtotal * 0.4,
          totalPrice: bill.subtotal * 0.4,
        },
      ]
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Seeded data summary:');
  console.log(`   👥 Users: ${await prisma.user.count()}`);
  console.log(`   📂 Categories: ${await prisma.category.count()}`);
  console.log(`   📦 Inventory Items: ${await prisma.inventoryItem.count()}`);
  console.log(`   📝 Transactions: ${await prisma.transaction.count()}`);
  console.log(`   🔧 Maintenance Schedules: ${await prisma.maintenanceSchedule.count()}`);
  console.log(`   ⚠️  Low Stock Alerts: ${await prisma.lowStockAlert.count()}`);
  console.log(`   💰 Bills: ${await prisma.bill.count()}`);
  
  console.log('\n🔑 Login Credentials:');
  console.log('   Admin: admin@medical.com / admin123');
  console.log('   Staff: staff@medical.com / staff123');
  console.log('   Medical: medical@medical.com / medical123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });