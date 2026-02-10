const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const sample = (arr, count) => {
  const copy = [...arr];
  const out = [];
  while (out.length < count && copy.length > 0) {
    const idx = randInt(0, copy.length - 1);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

async function createManyInChunks(model, data, chunkSize = 1000) {
  const chunks = chunkArray(data, chunkSize);
  for (const chunk of chunks) {
    await prisma[model].createMany({ data: chunk, skipDuplicates: true });
  }
}

async function main() {
  console.log('Cleaning up existing data...');

  await prisma.notification.deleteMany();
  await prisma.cashRegisterAssignment.deleteMany();
  await prisma.entityAccount.deleteMany();
  await prisma.userAssociate.deleteMany();
  await prisma.cashRegisterRecord.deleteMany();
  await prisma.cashRegisterWithdraw.deleteMany();
  await prisma.transactions.deleteMany();
  await prisma.saleReturnItem.deleteMany();
  await prisma.saleReturn.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseShipmentItem.deleteMany();
  await prisma.purchaseShipment.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.transferItem.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.productionMaterial.deleteMany();
  await prisma.productionProducts.deleteMany();
  await prisma.production.deleteMany();
  await prisma.productMaterial.deleteMany();
  await prisma.storeProduct.deleteMany();
  await prisma.shopProduct.deleteMany();
  await prisma.storeMaterial.deleteMany();
  await prisma.shopMaterial.deleteMany();
  await prisma.factoryProduct.deleteMany();
  await prisma.factoryMaterial.deleteMany();
  await prisma.product.deleteMany();
  await prisma.material.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.store.deleteMany();
  await prisma.factory.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.accounts.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();

  console.log('Existing data cleaned up.');

  const defaultPermission = await prisma.permission.create({
    data: {
      name: 'default',
      permissions: [
        'material_create', 'material_read', 'material_edit', 'material_delete',
        'product_read', 'product_create', 'product_edit', 'product_delete',
        'unit_read', 'unit_create', 'unit_edit', 'unit_delete',
        'brand_read', 'brand_create', 'brand_edit', 'brand_delete',
        'product_category_read', 'product_category_create', 'product_category_edit', 'product_category_delete',
        'factory_create', 'factory_edit', 'factory_delete', 'factory_read',
        'store_create', 'store_edit', 'store_delete', 'store_read',
        'shop_create', 'shop_edit', 'shop_delete', 'shop_read',
        'inventory_adjustment_create', 'inventory_adjustment_read',
        'cash_register_read', 'cash_register_create', 'cash_register_edit', 'cash_register_delete',
        'cash_register_open', 'cash_register_close', 'cash_register_withdraw', 'cash_register_deposit',
        'bank_account_read', 'bank_account_create', 'bank_account_edit', 'bank_account_delete',
        'bank_account_deposit', 'bank_account_withdraw',
        'account_read', 'account_create', 'account_edit', 'account_delete',
        'account_deposit', 'account_withdraw', 'account_transfer', 'account_statement',
        'purchases_create', 'purchases_edit', 'purchases_delete', 'purchases_read', 'purchases_change_status', 'purchase_add_payment',
        'purchases_return_create', 'purchases_return_edit', 'purchases_return_delete', 'purchases_return_read',
        'production_create', 'production_edit', 'production_delete', 'production_read', 'production_change_status', 'production_complete',
        'sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_add_payment',
        'sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read',
        'transfers_create', 'transfers_edit', 'transfers_delete', 'transfers_read', 'transfers_change_status', 'transfers_receive',
        'damage_create', 'damage_edit', 'damage_delete', 'damage_read',
        'repairs_create', 'repairs_edit', 'repairs_delete', 'repairs_read',
        
        'expenses_create', 'expenses_edit', 'expenses_delete', 'expenses_read',
        'salary_create', 'salary_edit', 'salary_delete', 'salary_read',
        'leave_approve', 'leave_approve_all', 'leave_read', 'leave_request_create', 'leave_request_edit', 'leave_request_delete',
        'holiday_create', 'holiday_edit', 'holiday_delete', 'holiday_read', 'holiday_manage',
        'leave_category_manage', 'payroll_manage', 'approve_salary', 'approve_clock_in_out', 'add_salary', 'edit_salary',
        'hrm_read', 'hrm_employee_manage', 'clock_in_out_manage',

        'general_ledger_report', 'trial_balance_report', 'balance_sheet_report', 'cash_and_bank_report',
        'sales_report', 'purchases_report', 'production_report', 'wastage_report', 'stock_report', 'transfer_report',
        'profit_loss_report', 'purchase_sales_report', 'customer_report', 'supplier_report',
        'best_selling_product_report', 'worst_selling_product_report', 'profit_calender_report',
        
        'user_create', 'user_edit', 'user_delete', 'user_read', 'user_activate_deactivate', 'user_logout', 'user_associate_create', 'user_activity_log_read',
        'hrm_settings_edit',
        'role_create', 'role_edit', 'role_delete', 'role_read',
        'customer_read', 'customer_create', 'customer_edit', 'customer_delete',
        'supplier_read', 'supplier_create', 'supplier_edit', 'supplier_delete',
        'general_settings_edit', 'company_settings_edit', 'notification_read',
        'data_import', 'data_export',
      ],
    },
  });

  const managerPermission = await prisma.permission.create({
    data: {
      name: 'manager',
      permissions: ['user_read', 'sales_read', 'purchases_read', 'inventory_adjustment_read']
    },
  });

  const cashierPermission = await prisma.permission.create({
    data: {
      name: 'cashier',
      permissions: ['sales_create', 'sales_read', 'cash_register_open', 'cash_register_close']
    },
  });

  const storeKeeperPermission = await prisma.permission.create({
    data: {
      name: 'store_keeper',
      permissions: ['material_read', 'product_read', 'store_read', 'inventory_adjustment_create']
    },
  });

  const adminPassword = await bcrypt.hash('asd123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'adminuser',
      name: 'Admin',
      password: adminPassword,
      permissionId: defaultPermission.id,
    },
  });

  const permissionPool = [defaultPermission, managerPermission, cashierPermission, storeKeeperPermission];
  const extraUsers = [];
  for (let i = 1; i <= 19; i += 1) {
    const perm = pick(permissionPool);
    extraUsers.push({
      email: `user${i}@example.com`,
      username: `user${i}`,
      name: `User ${i}`,
      password: await bcrypt.hash(`user${i}pass`, 10),
      permissionId: perm.id,
    });
  }
  await prisma.user.createMany({ data: extraUsers });

  const factories = await Promise.all([
    prisma.factory.create({ data: { name: 'Main Factory', phone: '01711111111', manager: 'Mr. Hasan', email: 'factory@example.com', address: 'Dhaka, Bangladesh' } }),
    prisma.factory.create({ data: { name: 'North Factory', phone: '01711111112', manager: 'Mr. Karim', email: 'northfactory@example.com', address: 'Gazipur, Bangladesh' } }),
    prisma.factory.create({ data: { name: 'South Factory', phone: '01711111113', manager: 'Ms. Fatima', email: 'southfactory@example.com', address: 'Narayanganj, Bangladesh' } }),
    prisma.factory.create({ data: { name: 'West Factory', phone: '01711111114', manager: 'Mr. Rahim', email: 'westfactory@example.com', address: 'Savar, Bangladesh' } }),
  ]);

  const stores = await Promise.all([
    prisma.store.create({ data: { name: 'Central Store', address: 'Uttara, Dhaka', store_keeper: 'Shafiq', mobile: '01722222222' } }),
    prisma.store.create({ data: { name: 'East Store', address: 'Badda, Dhaka', store_keeper: 'Kamal', mobile: '01722222223' } }),
    prisma.store.create({ data: { name: 'West Store', address: 'Mirpur, Dhaka', store_keeper: 'Jamal', mobile: '01722222224' } }),
    prisma.store.create({ data: { name: 'South Store', address: 'Dhanmondi, Dhaka', store_keeper: 'Rina', mobile: '01722222225' } }),
  ]);

  const shops = await Promise.all([
    prisma.shop.create({ data: { name: 'BSP Retail Shop', address: 'Banani, Dhaka', shop_keeper: 'Rahim', mobile: '01733333333' } }),
    prisma.shop.create({ data: { name: 'BSP Gulshan Shop', address: 'Gulshan, Dhaka', shop_keeper: 'Karim', mobile: '01733333334' } }),
    prisma.shop.create({ data: { name: 'BSP Bashundhara Shop', address: 'Bashundhara, Dhaka', shop_keeper: 'Sadia', mobile: '01733333335' } }),
    prisma.shop.create({ data: { name: 'BSP Motijheel Shop', address: 'Motijheel, Dhaka', shop_keeper: 'Tarek', mobile: '01733333336' } }),
  ]);

  const suppliersData = Array.from({ length: 10 }, (_, i) => ({
    name: `Supplier ${String(i + 1).padStart(2, '0')}`,
    mobile: `01744${String(10000 + i).padStart(5, '0')}`,
    address: ['Dhaka', 'Chittagong', 'Khulna', 'Sylhet', 'Rajshahi'][i % 5],
  }));
  await prisma.supplier.createMany({ data: suppliersData });
  const suppliers = await prisma.supplier.findMany();
  
  const customersData = Array.from({ length: 200 }, (_, i) => ({
    name: `Customer ${String(i + 1).padStart(3, '0')}`,
    mobile: `01855${String(20000 + i).padStart(5, '0')}`,
    email: `customer${i + 1}@example.com`,
    address: ['Dhaka', 'Chittagong', 'Khulna', 'Sylhet', 'Rajshahi'][i % 5],
  }));
  await prisma.customer.createMany({ data: customersData, skipDuplicates: true });
  const customers = await prisma.customer.findMany();

  const units = ['kg', 'piece', 'liter', 'box', 'meter'];
  const brands = ['bsrm', 'rfl', 'berger', 'akij', 'beximco'];

  const materialData = Array.from({ length: 1000 }, (_, i) => {
    const unitCost = randFloat(10, 500, 2);
    return {
      name: `Material ${String(i + 1).padStart(4, '0')}`,
      brand: pick(brands),
      description: `Material description ${i + 1}`,
      barcode: `MAT-${String(i + 1).padStart(6, '0')}`,
      unit: pick(units),
      unit_cost: unitCost,
      sale_price: Number((unitCost * randFloat(1.15, 1.35)).toFixed(2)),
      current_stock: randInt(50, 500),
    };
  });
  await createManyInChunks('material', materialData, 500);

  const productData = Array.from({ length: 1000 }, (_, i) => {
    const cost = randFloat(100, 2000, 2);
    const salePrice = Number((cost * randFloat(1.2, 1.5)).toFixed(2));
    return {
      name: `Product ${String(i + 1).padStart(4, '0')}`,
      description: `Product description ${i + 1}`,
      sale_price: salePrice,
      wholesale_price: Number((salePrice * randFloat(0.85, 0.95)).toFixed(2)),
      cost,
      barcode: `PRD-${String(i + 1).padStart(6, '0')}`,
      category: ['Furniture', 'Accessories', 'Tools', 'Electronics'][i % 4],
      stock: randInt(10, 200),
    };
  });
  await createManyInChunks('product', productData, 500);

  const materials = await prisma.material.findMany({ select: { id: true, unit_cost: true, sale_price: true } });
  const products = await prisma.product.findMany({ select: { id: true, cost: true, sale_price: true } });

  const productMaterialLinks = [];
  for (let i = 0; i < 100; i += 1) {
    const product = products[i];
    const linkedMaterials = sample(materials, randInt(2, 4));
    for (const mat of linkedMaterials) {
      productMaterialLinks.push({
        product_id: product.id,
        material_id: mat.id,
        material_quantity: randFloat(0.5, 5, 2),
        price: randFloat(10, 500, 2),
      });
    }
  }
  if (productMaterialLinks.length > 0) {
    await createManyInChunks('productMaterial', productMaterialLinks, 1000);
  }

  const storeProductData = [];
  const storeMaterialData = [];
  for (const store of stores) {
    for (const product of products) {
      storeProductData.push({
        store_id: store.id,
        product_id: product.id,
        stock: randInt(10, 200),
        avg_cost: Number((product.cost * randFloat(0.9, 1.1)).toFixed(2)),
      });
    }
    for (const material of materials) {
      storeMaterialData.push({
        store_id: store.id,
        material_id: material.id,
        stock: randInt(50, 500),
        avg_cost: Number((material.unit_cost * randFloat(0.9, 1.1)).toFixed(2)),
      });
    }
  }
  await createManyInChunks('storeProduct', storeProductData, 1000);
  await createManyInChunks('storeMaterial', storeMaterialData, 1000);

  const shopProductData = [];
  const shopMaterialData = [];
  for (const shop of shops) {
    for (const product of products) {
      shopProductData.push({
        shop_id: shop.id,
        product_id: product.id,
        stock: randInt(5, 120),
        avg_cost: Number((product.cost * randFloat(0.95, 1.1)).toFixed(2)),
      });
    }
    for (const material of materials) {
      shopMaterialData.push({
        shop_id: shop.id,
        material_id: material.id,
        stock: randInt(20, 200),
        avg_cost: Number((material.unit_cost * randFloat(0.95, 1.1)).toFixed(2)),
      });
    }
  }
  await createManyInChunks('shopProduct', shopProductData, 1000);
  await createManyInChunks('shopMaterial', shopMaterialData, 1000);

  const factoryProductData = [];
  const factoryMaterialData = [];
  for (const factory of factories) {
    for (const product of products) {
      factoryProductData.push({
        factoryId: factory.id,
        productId: product.id,
        stock: randInt(20, 300),
        avg_cost: Number((product.cost * randFloat(0.9, 1.05)).toFixed(2)),
      });
    }
    for (const material of materials) {
      factoryMaterialData.push({
        factoryId: factory.id,
        materialId: material.id,
        stock: randInt(100, 800),
        avg_cost: Number((material.unit_cost * randFloat(0.9, 1.05)).toFixed(2)),
      });
    }
  }
  await createManyInChunks('factoryProduct', factoryProductData, 1000);
  await createManyInChunks('factoryMaterial', factoryMaterialData, 1000);

  const cashRegisterData = Array.from({ length: 6 }, (_, i) => ({
    name: `Cash Register ${i + 1}`,
    status: i % 2 === 0 ? 'active' : 'closed',
    cash_in_hand: randInt(1000, 50000),
  }));
  await prisma.cashRegister.createMany({ data: cashRegisterData });
  const cashRegisters = await prisma.cashRegister.findMany();

  const bankAccountData = Array.from({ length: 5 }, (_, i) => ({
    name: `Bank Account ${i + 1}`,
    account_number: `BA-${String(i + 1).padStart(6, '0')}`,
    starting_balance: randInt(50000, 200000),
    current_balance: randInt(80000, 300000),
    withdraw_charge: randInt(1, 20),
  }));
  await prisma.bankAccount.createMany({ data: bankAccountData });
  const bankAccounts = await prisma.bankAccount.findMany();

  const accountData = Array.from({ length: 6 }, (_, i) => ({
    name: `Account ${i + 1}`,
    account_number: `ACCT-${String(i + 1).padStart(5, '0')}`,
    balance: randInt(10000, 500000),
    status: 'active',
  }));
  await prisma.accounts.createMany({ data: accountData });
  const accounts = await prisma.accounts.findMany();

  const entityAccounts = [];
  const allEntities = [
    ...shops.map(s => ({ type: 'shop', id: s.id })),
    ...stores.map(s => ({ type: 'store', id: s.id })),
    ...factories.map(f => ({ type: 'factory', id: f.id })),
  ];
  allEntities.forEach((entity, idx) => {
    entityAccounts.push({
      entityType: entity.type,
      entityId: entity.id,
      accountId: accounts[idx % accounts.length].id,
      isPrimary: true,
      assignedById: admin.id,
    });
  });
  await prisma.entityAccount.createMany({ data: entityAccounts });
  const entityAccountMap = {};
  entityAccounts.forEach((ea) => {
    entityAccountMap[`${ea.entityType}-${ea.entityId}`] = ea.accountId;
  });

  const cashRegisterAssignments = shops.map((shop, idx) => ({
    entityType: 'shop',
    entityId: shop.id,
    cashRegisterId: cashRegisters[idx % cashRegisters.length].id,
    assignedById: admin.id,
    notes: `Register assignment for ${shop.name}`,
  }));
  await prisma.cashRegisterAssignment.createMany({ data: cashRegisterAssignments });

  const userList = await prisma.user.findMany({ select: { id: true } });
  const userAssociates = [];
  for (let i = 0; i < Math.min(20, userList.length); i += 1) {
    const userId = userList[i].id;
    if (stores[i % stores.length]) {
      userAssociates.push({ userId, associateName: 'store', associateId: stores[i % stores.length].id });
    }
    if (shops[i % shops.length]) {
      userAssociates.push({ userId, associateName: 'shop', associateId: shops[i % shops.length].id });
    }
  }
  await prisma.userAssociate.createMany({ data: userAssociates, skipDuplicates: true });
  
  const employeeProfiles = userList.slice(0, 15).map((u, idx) => ({
    userId: u.id,
    designation: ['Manager', 'Supervisor', 'Operator', 'Technician'][idx % 4],
    baseSalary: randInt(12000, 40000),
    salaryType: 'monthly',
    joiningDate: new Date(Date.now() - randInt(30, 365) * 24 * 60 * 60 * 1000),
    status: 'active',
  }));
  await prisma.employeeProfile.createMany({ data: employeeProfiles, skipDuplicates: true });

  const now = new Date();
  const salaryRecords = [];
  for (const profile of employeeProfiles) {
    const base = profile.baseSalary || 0;
    for (let mOffset = 0; mOffset < 3; mOffset += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
      const allowances = randInt(0, 2000);
      const deductions = randInt(0, 1000);
      const gross = base + allowances;
      const net = gross - deductions;
      salaryRecords.push({
        userId: profile.userId,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        baseSalary: base,
        allowances,
        deductions,
        gross,
        net,
        status: pick(['generated', 'approved', 'paid']),
      });
    }
  }
  await prisma.salary.createMany({ data: salaryRecords, skipDuplicates: true });

  console.log('Seeding purchases (3000)...');
  for (let i = 0; i < 3000; i += 1) {
    const destinationType = pick(['store', 'shop', 'factory']);
    const destinationId =
      destinationType === 'store'
        ? pick(stores).id
        : destinationType === 'shop'
          ? pick(shops).id
          : pick(factories).id;

    const itemsCount = randInt(1, 3);
    const purchaseItems = [];
    let total = 0;

    for (let j = 0; j < itemsCount; j += 1) {
      const itemType = pick(['product', 'material']);
      if (itemType === 'product') {
        const product = pick(products);
        const quantity = randInt(1, 50);
        const unitPrice = Number((product.cost * randFloat(0.95, 1.2)).toFixed(2));
        const totalPrice = Number((unitPrice * quantity).toFixed(2));
        total += totalPrice;
        purchaseItems.push({
          itemType,
          productId: product.id,
          quantity,
          unitPrice,
          totalPrice,
        });
      } else {
        const material = pick(materials);
        const quantity = randInt(5, 80);
        const unitPrice = Number((material.unit_cost * randFloat(0.95, 1.2)).toFixed(2));
        const totalPrice = Number((unitPrice * quantity).toFixed(2));
        total += totalPrice;
        purchaseItems.push({
          itemType,
          materialId: material.id,
          quantity,
          unitPrice,
          totalPrice,
        });
      }
    }

    const paidAmount = Number((total * randFloat(0.4, 1)).toFixed(2));
    const accountId = entityAccountMap[`${destinationType}-${destinationId}`] || pick(accounts).id;

    const purchase = await prisma.purchase.create({
      data: {
        reference: `PUR-${String(i + 1).padStart(6, '0')}`,
        supplierId: pick(suppliers).id,
        destinationType,
        destinationId,
        grandTotal: Number(total.toFixed(2)),
        shippingCost: 0,
        shippingStatus: 'received',
        discount: 0,
        tax: 0,
        paidAmount,
        accountId,
        purchaseItems: { create: purchaseItems },
      },
      include: { purchaseItems: true }
    });

    if (purchase.paidAmount > 0) {
      await prisma.transactions.create({
        data: {
          reference: `TXN-PUR-${purchase.id}`,
          createdById: admin.id,
          accountId,
          purchaseId: purchase.id,
          purpose: 'purchase',
          added_to_account: false,
          amount: purchase.paidAmount,
          payment_method: pick(['cash', 'bank', 'mobile']),
          current_account_balance: 0,
        },
      });
    }

    const shipmentItems = purchase.purchaseItems.map((pi) => ({
      purchaseItemId: pi.id,
      itemType: pi.itemType,
      materialId: pi.materialId,
      productId: pi.productId,
      quantity: pi.quantity,
      received_quantity: pi.quantity,
    }));
    await prisma.purchaseShipment.create({
      data: {
        purchaseId: purchase.id,
        reference: `SHIP-${String(i + 1).padStart(6, '0')}`,
        status: 'received',
        receivedAt: new Date(),
        items: { create: shipmentItems },
      }
    });
  }

  console.log('Seeding sales (4000)...');
  for (let i = 0; i < 4000; i += 1) {
    const shop = pick(shops);
    const itemsCount = randInt(1, 3);
    const saleItems = [];
    let totalAmount = 0;
    let totalCost = 0;

    for (let j = 0; j < itemsCount; j += 1) {
      const itemType = pick(['product', 'material']);
      if (itemType === 'product') {
        const product = pick(products);
        const quantity = randInt(1, 5);
        const unitPrice = Number(product.sale_price.toFixed(2));
        const avgCost = Number(product.cost.toFixed(2));
        const totalPrice = Number((unitPrice * quantity).toFixed(2));
        totalAmount += totalPrice;
        totalCost += avgCost * quantity;
        saleItems.push({
          productId: product.id,
          quantity,
          unitPrice,
          avg_cost: avgCost,
          totalPrice,
        });
      } else {
        const material = pick(materials);
        const quantity = randInt(1, 10);
        const unitPrice = Number(material.sale_price.toFixed(2));
        const avgCost = Number(material.unit_cost.toFixed(2));
        const totalPrice = Number((unitPrice * quantity).toFixed(2));
        totalAmount += totalPrice;
        totalCost += avgCost * quantity;
        saleItems.push({
          materialId: material.id,
          quantity,
          unitPrice,
          avg_cost: avgCost,
          totalPrice,
        });
      }
    }

    const paymentType = pick(['cash', 'card', 'bank', 'mobile']);
    const paidAmount = Number((totalAmount * randFloat(0.7, 1)).toFixed(2));
    const bankAccount = (paymentType === 'bank' || paymentType === 'card') ? pick(bankAccounts) : null;

    const sale = await prisma.sale.create({
      data: {
        reference: `SAL-${String(i + 1).padStart(6, '0')}`,
        shopId: shop.id,
        customerId: pick(customers).id,
        totalAmount: Number(totalAmount.toFixed(2)),
        discount: 0,
        grandTotal: Number(totalAmount.toFixed(2)),
        total_cost: Number(totalCost.toFixed(2)),
        paymentType,
        paidAmount,
        bankAccountId: bankAccount ? bankAccount.id : null,
        bankName: bankAccount ? bankAccount.name : null,
        saleItems: { create: saleItems },
      },
    });

    if (sale.paidAmount > 0) {
      const accountId = entityAccountMap[`shop-${shop.id}`] || pick(accounts).id;
      await prisma.transactions.create({
        data: {
          reference: `TXN-SAL-${sale.id}`,
          createdById: admin.id,
          accountId,
          saleId: sale.id,
          cashRegisterId: paymentType === 'cash' ? pick(cashRegisters).id : null,
          bankAccountId: bankAccount ? bankAccount.id : null,
          purpose: 'sale',
          added_to_account: true,
          amount: sale.paidAmount,
          payment_method: paymentType,
          current_account_balance: 0,
        },
      });
    }
  }

  console.log('Seeding transfers (6000)...');
  const transferStatuses = ['processing', 'pending', 'being_shipped', 'transferred', 'not_received'];
  for (let i = 0; i < 6000; i += 1) {
    const fromType = pick(['store', 'shop', 'factory']);
    let toType = pick(['store', 'shop', 'factory']);
    while (toType === fromType) {
      toType = pick(['store', 'shop', 'factory']);
    }
    const fromId =
      fromType === 'store'
        ? pick(stores).id
        : fromType === 'shop'
          ? pick(shops).id
          : pick(factories).id;
    const toId =
      toType === 'store'
        ? pick(stores).id
        : toType === 'shop'
          ? pick(shops).id
          : pick(factories).id;
    const status = pick(transferStatuses);

    const itemsCount = randInt(1, 3);
    const transferItems = [];
    for (let j = 0; j < itemsCount; j += 1) {
      const itemType = pick(['product', 'material']);
      if (itemType === 'product') {
        const product = pick(products);
        const quantity = randInt(1, 20);
        transferItems.push({
          item: 'product',
          itemId: product.id,
          productId: product.id,
          materialId: null,
          quantity,
          receivedQuantity: status === 'transferred' ? quantity : null,
          avg_cost: Number(product.cost.toFixed(2)),
        });
      } else {
        const material = pick(materials);
        const quantity = randInt(5, 50);
        transferItems.push({
          item: 'material',
          itemId: material.id,
          productId: null,
          materialId: material.id,
          quantity,
          receivedQuantity: status === 'transferred' ? quantity : null,
          avg_cost: Number(material.unit_cost.toFixed(2)),
        });
      }
    }

    await prisma.transfer.create({
      data: {
        reference: `TRF-${String(i + 1).padStart(6, '0')}`,
        from: fromType,
        fromId,
        to: toType,
        toId,
        shipping_cost: randFloat(0, 2000, 2),
        status,
        note: `Transfer ${i + 1}`,
        transferItems: { create: transferItems },
      },
    });
  }

  const notifications = Array.from({ length: 10 }, (_, i) => ({
    title: `Notification ${i + 1}`,
    description: `Auto-generated notification ${i + 1}`,
    link: '/dashboard',
    forRole: pick(['store_keeper', 'manager', 'admin', 'cashier']),
  }));
  await prisma.notification.createMany({ data: notifications });

  const productions = [];
  for (let i = 0; i < 100; i += 1) {
    const factory = pick(factories);
    const product = pick(products);
    const material = pick(materials);
    productions.push({
      reference: `PROD-${String(i + 1).padStart(6, '0')}`,
      start_date: new Date(Date.now() - randInt(1, 30) * 24 * 60 * 60 * 1000),
      estimated_end_date: new Date(Date.now() + randInt(1, 30) * 24 * 60 * 60 * 1000),
      factoryId: factory.id,
      status: pick(['pending', 'running', 'production_done']),
      productionProducts: {
        create: [
          {
            productId: product.id,
            code: `PRD-${product.id}-B${i + 1}`,
            quantity: randInt(10, 100),
            unit_cost: Number(product.cost.toFixed(2)),
            received: randInt(5, 90),
            scrap: randInt(0, 5),
          },
        ],
      },
      productionMaterials: {
        create: [
          {
            materialId: material.id,
            quantity: randInt(50, 200),
            price: Number(material.unit_cost.toFixed(2)),
            scrap: randInt(0, 10),
          },
        ],
      },
    });
  }

  for (const production of productions) {
    await prisma.production.create({ data: production });
  }

  console.log('✅ Seeding completed successfully!');
  console.log(`Created ${await prisma.permission.count()} permissions`);
  console.log(`Created ${await prisma.user.count()} users`);
  console.log(`Created ${await prisma.factory.count()} factories`);
  console.log(`Created ${await prisma.store.count()} stores`);
  console.log(`Created ${await prisma.shop.count()} shops`);
  console.log(`Created ${await prisma.supplier.count()} suppliers`);
  console.log(`Created ${await prisma.material.count()} materials`);
  console.log(`Created ${await prisma.product.count()} products`);
  console.log(`Created ${await prisma.cashRegister.count()} cash registers`);
  console.log(`Created ${await prisma.bankAccount.count()} bank accounts`);
  console.log(`Created ${await prisma.accounts.count()} accounts`);
  console.log(`Created ${await prisma.purchase.count()} purchases`);
  console.log(`Created ${await prisma.production.count()} productions`);
  console.log(`Created ${await prisma.sale.count()} sales`);
  console.log(`Created ${await prisma.transfer.count()} transfers`);
  console.log(`Created ${await prisma.notification.count()} notifications`);
  console.log(`Created ${await prisma.cashRegisterAssignment.count()} cash register assignments`);
  console.log(`Created ${await prisma.entityAccount.count()} entity accounts`);
  console.log(`Created ${await prisma.userAssociate.count()} user associates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
