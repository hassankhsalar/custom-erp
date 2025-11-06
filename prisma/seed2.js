const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - be careful in production!)
  await clearExistingData();

  // Create suppliers
  console.log('Creating suppliers...');
  const suppliers = await createSuppliers();

  // Create stores
  console.log('Creating stores...');
  const stores = await createStores();

  // Create materials
  console.log('Creating materials...');
  const materials = await createMaterials();

  // Create products
  console.log('Creating products...');
  const products = await createProducts();

  // Create product materials relationships
  console.log('Creating product materials...');
  await createProductMaterials(products, materials);

  // Create purchases with multiple items
  console.log('Creating purchases...');
  await createPurchases(suppliers, stores, materials);

  // Create sales
  console.log('Creating sales...');
  await createSales(stores, products);

  console.log('✅ Seed completed successfully!');
}

async function clearExistingData() {
  // Be careful with this in production!
  const tables = [
    'SaleReturnItem',
    'SaleReturn',
    'SaleItem',
    'Sale',
    'PurchaseItem',
    'Purchase',
    'ProductMaterial',
    'StoreProduct',
    'StoreMaterial',
    'ProductionMaterial',
    'ProductionProducts',
    'FactoryToStoreTransfer',
    'Production',
    'Product',
    'Material',
    'Store',
    'Supplier',
    'Factory'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table};`);
      console.log(`Cleared ${table}`);
    } catch (error) {
      console.log(`Could not clear ${table}: ${error.message}`);
    }
  }
}

async function createSuppliers() {
  const suppliers = await prisma.supplier.createManyAndReturn({
    data: [
      {
        name: 'ABC Steel Suppliers',
        mobile: '+1234567890',
        address: '123 Industrial Area, City',
      },
      {
        name: 'XYZ Metal Works',
        mobile: '+0987654321',
        address: '456 Commercial Zone, Town',
      },
      {
        name: 'Global Hardware Ltd',
        mobile: '+1122334455',
        address: '789 Business District, Metro',
      },
    ],
  });
  return suppliers;
}

async function createStores() {
  const stores = await prisma.store.createManyAndReturn({
    data: [
      {
        name: 'Main Store - Downtown',
        address: '123 Main Street, Downtown',
        store_keeper: 'John Smith',
        mobile: '+1112223333',
      },
      {
        name: 'Branch Store - Uptown',
        address: '456 Uptown Avenue',
        store_keeper: 'Sarah Johnson',
        mobile: '+4445556666',
      },
      {
        name: 'Warehouse - Industrial Area',
        address: '789 Industrial Zone',
        store_keeper: 'Mike Wilson',
        mobile: '+7778889999',
      },
    ],
  });
  return stores;
}

async function createMaterials() {
  const materials = await prisma.material.createManyAndReturn({
    data: [
      {
        name: 'Steel Rod 10mm',
        description: 'High tensile steel rod 10mm diameter',
        brand: 'Tata Steel',
        barcode: 'MAT001001',
        unit: 'kg',
        unit_cost: 85.50,
        current_stock: 1500,
      },
      {
        name: 'Steel Rod 12mm',
        description: 'High tensile steel rod 12mm diameter',
        brand: 'Tata Steel',
        barcode: 'MAT001002',
        unit: 'kg',
        unit_cost: 95.75,
        current_stock: 1200,
      },
      {
        name: 'Cement OPC 53 Grade',
        description: 'Ordinary Portland Cement 53 Grade',
        brand: 'UltraTech',
        barcode: 'MAT002001',
        unit: 'bag',
        unit_cost: 380.00,
        current_stock: 500,
      },
      {
        name: 'River Sand',
        description: 'Fine aggregate river sand',
        brand: 'Natural',
        barcode: 'MAT003001',
        unit: 'cubic meter',
        unit_cost: 1200.00,
        current_stock: 200,
      },
      {
        name: 'Coarse Aggregate 20mm',
        description: '20mm coarse aggregate for concrete',
        brand: 'Natural',
        barcode: 'MAT004001',
        unit: 'cubic meter',
        unit_cost: 800.00,
        current_stock: 300,
      },
      {
        name: 'Binding Wire',
        description: 'GI binding wire for reinforcement',
        brand: 'Local',
        barcode: 'MAT005001',
        unit: 'kg',
        unit_cost: 65.00,
        current_stock: 200,
      },
      {
        name: 'Plywood 18mm',
        description: 'Commercial grade plywood 18mm thick',
        brand: 'Greenply',
        barcode: 'MAT006001',
        unit: 'sheet',
        unit_cost: 1800.00,
        current_stock: 100,
      },
    ],
  });
  return materials;
}

async function createProducts() {
  const products = await prisma.product.createManyAndReturn({
    data: [
      {
        name: 'Precast Concrete Slab',
        description: 'Precast concrete slab for construction',
        sale_price: 2500.00,
        wholesale_price: 2200.00,
        cost: 1800.00,
        barcode: 'PROD001001',
        category: 'Construction',
        stock: 50,
      },
      {
        name: 'Concrete Block',
        description: 'Standard concrete building block',
        sale_price: 45.00,
        wholesale_price: 38.00,
        cost: 25.00,
        barcode: 'PROD002001',
        category: 'Construction',
        stock: 1000,
      },
      {
        name: 'Steel Gate',
        description: 'Ornamental steel security gate',
        sale_price: 8500.00,
        wholesale_price: 7200.00,
        cost: 5500.00,
        barcode: 'PROD003001',
        category: 'Metal Works',
        stock: 25,
      },
      {
        name: 'Window Frame',
        description: 'Steel window frame with fittings',
        sale_price: 3200.00,
        wholesale_price: 2800.00,
        cost: 2100.00,
        barcode: 'PROD004001',
        category: 'Metal Works',
        stock: 40,
      },
    ],
  });
  return products;
}

async function createProductMaterials(products, materials) {
  await prisma.productMaterial.createMany({
    data: [
      // Precast Concrete Slab materials
      {
        product_id: products[0].id,
        material_id: materials[0].id, // Steel Rod 10mm
        material_quantity: 25.5, // kg
        price: 85.50,
      },
      {
        product_id: products[0].id,
        material_id: materials[1].id, // Steel Rod 12mm
        material_quantity: 15.2, // kg
        price: 95.75,
      },
      {
        product_id: products[0].id,
        material_id: materials[2].id, // Cement
        material_quantity: 2.5, // bags
        price: 380.00,
      },
      
      // Concrete Block materials
      {
        product_id: products[1].id,
        material_id: materials[2].id, // Cement
        material_quantity: 0.25, // bags per block
        price: 380.00,
      },
      {
        product_id: products[1].id,
        material_id: materials[3].id, // Sand
        material_quantity: 0.01, // cubic meters per block
        price: 1200.00,
      },
      
      // Steel Gate materials
      {
        product_id: products[2].id,
        material_id: materials[0].id, // Steel Rod 10mm
        material_quantity: 35.0, // kg
        price: 85.50,
      },
      {
        product_id: products[2].id,
        material_id: materials[5].id, // Binding Wire
        material_quantity: 2.5, // kg
        price: 65.00,
      },
    ],
  });
}

async function createPurchases(suppliers, stores, materials) {
  // Purchase 1: Multiple materials from ABC Steel
  const purchase1 = await prisma.purchase.create({
    data: {
      reference: 'PUR-2024-001',
      supplierId: suppliers[0].id,
      storeId: stores[0].id,
      grandTotal: 184250.00,
      purchaseItems: {
        create: [
          {
            materialId: materials[0].id, // Steel Rod 10mm
            quantity: 1000, // kg
            unitPrice: 85.50,
            totalPrice: 85500.00,
          },
          {
            materialId: materials[1].id, // Steel Rod 12mm
            quantity: 800, // kg
            unitPrice: 95.75,
            totalPrice: 76600.00,
          },
          {
            materialId: materials[5].id, // Binding Wire
            quantity: 300, // kg
            unitPrice: 65.00,
            totalPrice: 19500.00,
          },
        ],
      },
    },
  });

  // Purchase 2: Construction materials from XYZ Metal
  const purchase2 = await prisma.purchase.create({
    data: {
      reference: 'PUR-2024-002',
      supplierId: suppliers[1].id,
      storeId: stores[1].id,
      grandTotal: 286000.00,
      purchaseItems: {
        create: [
          {
            materialId: materials[2].id, // Cement
            quantity: 500, // bags
            unitPrice: 380.00,
            totalPrice: 190000.00,
          },
          {
            materialId: materials[3].id, // River Sand
            quantity: 50, // cubic meters
            unitPrice: 1200.00,
            totalPrice: 60000.00,
          },
          {
            materialId: materials[4].id, // Coarse Aggregate
            quantity: 45, // cubic meters
            unitPrice: 800.00,
            totalPrice: 36000.00,
          },
        ],
      },
    },
  });

  // Purchase 3: Wood materials from Global Hardware
  const purchase3 = await prisma.purchase.create({
    data: {
      reference: 'PUR-2024-003',
      supplierId: suppliers[2].id,
      storeId: stores[0].id,
      grandTotal: 180000.00,
      purchaseItems: {
        create: [
          {
            materialId: materials[6].id, // Plywood
            quantity: 100, // sheets
            unitPrice: 1800.00,
            totalPrice: 180000.00,
          },
        ],
      },
    },
  });

  return [purchase1, purchase2, purchase3];
}

async function createSales(stores, products) {
  // Sale 1: Multiple products
  const sale1 = await prisma.sale.create({
    data: {
      reference: 'SALE-2024-001',
      storeId: stores[0].id,
      customer: 'Construction Corp Ltd',
      totalAmount: 38500.00,
      discount: 500.00,
      grandTotal: 38000.00,
      paymentType: 'bank_transfer',
      saleItems: {
        create: [
          {
            productId: products[0].id, // Precast Slab
            quantity: 10,
            unitPrice: 2500.00,
            totalPrice: 25000.00,
          },
          {
            productId: products[1].id, // Concrete Block
            quantity: 300,
            unitPrice: 45.00,
            totalPrice: 13500.00,
          },
        ],
      },
    },
  });

  // Sale 2: Single product
  const sale2 = await prisma.sale.create({
    data: {
      reference: 'SALE-2024-002',
      storeId: stores[1].id,
      customer: 'Residential Builder',
      totalAmount: 17000.00,
      discount: 0,
      grandTotal: 17000.00,
      paymentType: 'cash',
      saleItems: {
        create: [
          {
            productId: products[2].id, // Steel Gate
            quantity: 2,
            unitPrice: 8500.00,
            totalPrice: 17000.00,
          },
        ],
      },
    },
  });

  return [sale1, sale2];
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });