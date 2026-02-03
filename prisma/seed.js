const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create a default permission
  const defaultPermission = await prisma.permission.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      permissions: [
        "material_create",
        "material_read",
        "material_edit",
        "material_delete",
        "product_create",
        "product_read",
        "product_edit",
        "product_delete",
        "production_create",
        "production_read",
        "production_edit",
        "production_delete",
        "purchase_create",
        "purchase_read",
        "purchase_edit",
        "purchase_delete",
        "sale_create",
        "sale_read",
        "sale_edit",
        "sale_delete",
        "transfer_create",
        "transfer_read",
        "transfer_edit",
        "transfer_delete",
        "report_create",
        "report_read",
        "report_edit",
        "report_delete"
      ],
    },
  });

  const adminPassword = await bcrypt.hash('asd123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'adminuser',
      name: 'Admin',
      password: adminPassword,
      permissionId: defaultPermission.id,
    },
  });

  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'regularuser',
      name: 'User',
      password: userPassword,
      permissionId: defaultPermission.id,
    },
  });

  // --- FACTORY ---
  const factory = await prisma.factory.create({
    data: {
      name: "Main Factory",
      phone: "01711111111",
      manager: "Mr. Hasan",
      email: "factory@example.com",
      address: "Dhaka, Bangladesh",
    },
  });

  // --- STORE ---
  const store = await prisma.store.create({
    data: {
      name: "Central Store",
      address: "Uttara, Dhaka",
      store_keeper: "Shafiq",
      mobile: "01722222222",
    },
  });

  // --- SHOP ---
  const shop = await prisma.shop.create({
    data: {
      name: "BSP Retail Shop",
      address: "Banani, Dhaka",
      shop_keeper: "Rahim",
      mobile: "01733333333",
    },
  });

  // --- SUPPLIER ---
  const supplier = await prisma.supplier.create({
    data: {
      name: "ABC Supplies Ltd.",
      mobile: "01744444444",
      address: "Chittagong",
    },
  });

  // --- MATERIALS ---
  const materials = await prisma.material.createMany({
    data: [
      { name: "Steel Rod", brand: "bsrm", description: "long lasting", barcode: "SR-0120", unit: "kg", unit_cost: 100, sale_price: 120, current_stock: 100 },
      { name: "Plastic Sheet", brand: "rfl", description: "strong plastic", barcode: "PS-0130", unit: "kg", unit_cost: 50, sale_price: 60, current_stock: 200 },
      { name: "Paint", brand: "berger", description: "long lasting paint", barcode: "P-0120", unit: "liter", unit_cost: 120, sale_price: 130, current_stock: 50 },
    ],
  });

  const allMaterials = await prisma.material.findMany();

  // --- PRODUCTS ---
  const product1 = await prisma.product.create({
    data: {
      name: "Steel Chair",
      description: "Durable metal chair",
      sale_price: 1200,
      wholesale_price: 1000,
      cost: 800,
      stock: 20,
      materials: {
        create: [
          {
            material_id: allMaterials[0].id, // Steel Rod
            material_quantity: 3,
            price: 300,
          },
          {
            material_id: allMaterials[2].id, // Paint
            material_quantity: 0.5,
            price: 60,
          },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: "Plastic Table",
      description: "Lightweight table",
      sale_price: 1800,
      wholesale_price: 1500,
      cost: 1300,
      stock: 10,
    },
  });

  // --- LINK PRODUCTS TO STORE/SHOP ---
  await prisma.storeProduct.createMany({
    data: [
      { store_id: store.id, product_id: product1.id, stock: 20 },
      { store_id: store.id, product_id: product2.id, stock: 10 },
    ],
  });

  await prisma.shopProduct.createMany({
    data: [
      { shop_id: shop.id, product_id: product1.id, stock: 5 },
      { shop_id: shop.id, product_id: product2.id, stock: 3 },
    ],
  });

  // --- PURCHASE ---
  const purchase = await prisma.purchase.create({
    data: {
      reference: "PUR-001",
      supplierId: supplier.id,
      destinationType: 'store',
      destinationId: store.id,
      grandTotal: 30000,
      purchaseItems: {
        create: [
          {
            materialId: allMaterials[0].id,
            quantity: 100,
            unitPrice: 100,
            totalPrice: 10000,
          },
          {
            materialId: allMaterials[1].id,
            quantity: 200,
            unitPrice: 50,
            totalPrice: 10000,
          },
        ],
      },
    },
  });

  // --- SALE --- (FIXED)
  const sale = await prisma.sale.create({
    data: {
      reference: "SAL-001",
      shopId: shop.id,
      customer: "John Doe",
      totalAmount: 3000,
      discount: 0,
      grandTotal: 3000,
      paymentType: "cash",
      saleItems: {
        create: [
          {
            product: {
              connect: { id: product1.id }
            },
            quantity: 2,
            unitPrice: 1200,
            totalPrice: 2400,
          },
          {
            product: {
              connect: { id: product2.id }
            },
            quantity: 1,
            unitPrice: 600,
            totalPrice: 600,
          },
        ],
      },
    },
  });

  // Create some more test sales
  const sale2 = await prisma.sale.create({
    data: {
      reference: "SAL-002",
      shopId: shop.id,
      customer: "Jane Smith",
      totalAmount: 1800,
      discount: 100,
      grandTotal: 1700,
      paymentType: "card",
      saleItems: {
        create: [
          {
            product: {
              connect: { id: product1.id }
            },
            quantity: 1,
            unitPrice: 1200,
            totalPrice: 1200,
          },
          {
            material: {
              connect: { id: allMaterials[0].id } // Steel Rod
            },
            quantity: 5,
            unitPrice: 120,
            totalPrice: 600,
          },
        ],
      },
    },
  });

  // Create a sale with material only
  const sale3 = await prisma.sale.create({
    data: {
      reference: "SAL-003",
      shopId: shop.id,
      customer: "Walk-in Customer",
      totalAmount: 360,
      discount: 0,
      grandTotal: 360,
      paymentType: "cash",
      saleItems: {
        create: [
          {
            material: {
              connect: { id: allMaterials[2].id } // Paint
            },
            quantity: 3,
            unitPrice: 120,
            totalPrice: 360,
          },
        ],
      },
    },
  });

  console.log({ admin, user });
  
  console.log("✅ Seeding completed successfully!");
  console.log(`Created ${await prisma.sale.count()} sales`);
  console.log(`Created ${await prisma.saleItem.count()} sale items`);
  console.log(`Shop ID: ${shop.id} - ready for testing returns`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });