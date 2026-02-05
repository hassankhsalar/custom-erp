const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data first
  console.log('Cleaning up existing data...');
  
  // Delete in correct order (child tables first)
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
  await prisma.storeToShopTransferItem.deleteMany();
  await prisma.storeToShopTransfer.deleteMany();
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

  // Create a default permission
  const defaultPermission = await prisma.permission.create({
    data: {
      name: 'default',
      permissions: [
        // Product and material management permissions
        'material_create', 'material_read', 'material_edit', 'material_delete',
        'product_read', 'product_create', 'product_edit', 'product_delete',
        'unit_read', 'unit_create', 'unit_edit', 'unit_delete',
        'brand_read', 'brand_create', 'brand_edit', 'brand_delete',
        'product_category_read', 'product_category_create', 'product_category_edit', 'product_category_delete',

        // Store, factory and shop management permissions
        'factory_create', 'factory_edit', 'factory_delete', 'factory_read',
        'store_create', 'store_edit', 'store_delete', 'store_read',
        'shop_create', 'shop_edit', 'shop_delete', 'shop_read',
        'inventory_adjustment_create', 'inventory_adjustment_read',

        // Add cash register and bank account permissions
        'cash_register_read', 'cash_register_create', 'cash_register_edit', 'cash_register_delete',
        'cash_register_open', 'cash_register_close', 'cash_register_withdraw', 'cash_register_deposit',
        'bank_account_read', 'bank_account_create', 'bank_account_edit', 'bank_account_delete',
        'bank_account_deposit', 'bank_account_withdraw',

        // Add accounts permissions
        'account_read', 'account_create', 'account_edit', 'account_delete',
        'account_deposit', 'account_withdraw', 'account_transfer', 'account_statement',

        // Add purchase permissions
        'purchases_create', 'purchases_edit', 'purchases_delete', 'purchases_read', 'purchases_change_status', 'purchase_add_payment',
        'purchases_return_create', 'purchases_return_edit', 'purchases_return_delete', 'purchases_return_read',

        // Add production permissions
        'production_create', 'production_edit', 'production_delete', 'production_read', 'production_change_status', 

        // Add sales permissions
        'sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_add_payment',
        'sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read',

        // Add transfer permissions
        'transfers_create', 'transfers_edit', 'transfers_delete', 'transfers_read', 'transfers_change_status', 'transfers_recive',

        // Add Wastage/Damage permissions
        'damage_create', 'damage_edit', 'damage_delete', 'damage_read',

        // Add Repair permissions
        'repairs_create', 'repairs_edit', 'repairs_delete', 'repairs_read',

        // Add Expense permissions
        'expenses_create', 'expenses_edit', 'expenses_delete', 'expenses_read',

        // Add Salary and HRM permissions
        'salary_create', 'salary_edit', 'salary_delete', 'salary_read',
        'leave_approve', 'leave_read', 'holiday_create', 'holiday_edit', 'holiday_delete', 'holiday_read',
        
        // Add Report permissions
        'general_ledger_report', 'trial_balance_report', 'balance_sheet_report', 'cash_and_bank_report',
        'sales_report', 'purchases_report', 'production_report', 'wastage_report', 'stock_report', 'transfer_report',
        'profit_loss_report', 'purchase_sales_report', 'customer_report', 'supplier_report',
        'best_selling_product_report', 'worst_selling_product_report', 'profit_calender_report',

        // Add user management permissions
        'user_create', 'user_edit', 'user_delete', 'user_read', 'user_activate_deactivate', 'user_logout', 'user_associate_create', 'user_activity_log_read',

        // HRM Management
        'hrm_settings_edit',


        // Add role and permission management permissions
        'role_create', 'role_edit', 'role_delete', 'role_read',

        // Add customer permissions
        'customer_read', 'customer_create', 'customer_edit', 'customer_delete',

        // Add supplier permissions
        'supplier_read', 'supplier_create', 'supplier_edit', 'supplier_delete',

        // System Management
        'general_settings_edit', 'company_settings_edit', 'notification_read',
        'data_import', 'data_export',
      ],
    },
  });

  // Create additional permissions (total 4)
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

  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      username: 'regularuser',
      name: 'User',
      password: userPassword,
      permissionId: null,
    },
  });

  // Create 2 more users (total 4)
  const user3 = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      username: 'storemanager',
      name: 'Store Manager',
      password: await bcrypt.hash('manager123', 10),
      permissionId: managerPermission.id,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'cashier@example.com',
      username: 'shopcashier',
      name: 'Shop Cashier',
      password: await bcrypt.hash('cashier123', 10),
      permissionId: cashierPermission.id,
    },
  });

  // --- FACTORY --- (Total 4)
  const factories = await Promise.all([
    prisma.factory.create({
      data: {
        name: "Main Factory",
        phone: "01711111111",
        manager: "Mr. Hasan",
        email: "factory@example.com",
        address: "Dhaka, Bangladesh",
      },
    }),
    prisma.factory.create({
      data: {
        name: "North Factory",
        phone: "01711111112",
        manager: "Mr. Karim",
        email: "northfactory@example.com",
        address: "Gazipur, Bangladesh",
      },
    }),
    prisma.factory.create({
      data: {
        name: "South Factory",
        phone: "01711111113",
        manager: "Ms. Fatima",
        email: "southfactory@example.com",
        address: "Narayanganj, Bangladesh",
      },
    }),
    prisma.factory.create({
      data: {
        name: "West Factory",
        phone: "01711111114",
        manager: "Mr. Rahim",
        email: "westfactory@example.com",
        address: "Savar, Bangladesh",
      },
    }),
  ]);

  // --- STORE --- (Total 4) - Store has @unique on name
  const stores = await Promise.all([
    prisma.store.create({
      data: {
        name: "Central Store",
        address: "Uttara, Dhaka",
        store_keeper: "Shafiq",
        mobile: "01722222222",
      },
    }),
    prisma.store.create({
      data: {
        name: "East Store",
        address: "Badda, Dhaka",
        store_keeper: "Kamal",
        mobile: "01722222223",
      },
    }),
    prisma.store.create({
      data: {
        name: "West Store",
        address: "Mirpur, Dhaka",
        store_keeper: "Jamal",
        mobile: "01722222224",
      },
    }),
    prisma.store.create({
      data: {
        name: "South Store",
        address: "Dhanmondi, Dhaka",
        store_keeper: "Rina",
        mobile: "01722222225",
      },
    }),
  ]);

  // --- SHOP --- (Total 4) - Shop has @unique on name
  const shops = await Promise.all([
    prisma.shop.create({
      data: {
        name: "BSP Retail Shop",
        address: "Banani, Dhaka",
        shop_keeper: "Rahim",
        mobile: "01733333333",
      },
    }),
    prisma.shop.create({
      data: {
        name: "BSP Gulshan Shop",
        address: "Gulshan, Dhaka",
        shop_keeper: "Karim",
        mobile: "01733333334",
      },
    }),
    prisma.shop.create({
      data: {
        name: "BSP Bashundhara Shop",
        address: "Bashundhara, Dhaka",
        shop_keeper: "Sadia",
        mobile: "01733333335",
      },
    }),
    prisma.shop.create({
      data: {
        name: "BSP Motijheel Shop",
        address: "Motijheel, Dhaka",
        shop_keeper: "Tarek",
        mobile: "01733333336",
      },
    }),
  ]);

  // --- SUPPLIER --- (Total 4)
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "ABC Supplies Ltd.",
        mobile: "01744444444",
        address: "Chittagong",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "XYZ Corporation",
        mobile: "01744444445",
        address: "Dhaka",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Global Materials Inc.",
        mobile: "01744444446",
        address: "Khulna",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Prime Suppliers BD",
        mobile: "01744444447",
        address: "Sylhet",
      },
    }),
  ]);

  // --- MATERIALS --- (Total 4) - Material has @unique on barcode
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        name: "Steel Rod",
        brand: "bsrm",
        description: "long lasting",
        barcode: "SR-0120",
        unit: "kg",
        unit_cost: 100,
        sale_price: 120,
        current_stock: 100
      },
    }),
    prisma.material.create({
      data: {
        name: "Plastic Sheet",
        brand: "rfl",
        description: "strong plastic",
        barcode: "PS-0130",
        unit: "kg",
        unit_cost: 50,
        sale_price: 60,
        current_stock: 200
      },
    }),
    prisma.material.create({
      data: {
        name: "Paint",
        brand: "berger",
        description: "long lasting paint",
        barcode: "P-0120",
        unit: "liter",
        unit_cost: 120,
        sale_price: 130,
        current_stock: 50
      },
    }),
    prisma.material.create({
      data: {
        name: "Wood Plank",
        brand: "akij",
        description: "teak wood",
        barcode: "WP-0140",
        unit: "piece",
        unit_cost: 500,
        sale_price: 600,
        current_stock: 30
      },
    }),
  ]);

  // --- PRODUCTS --- (Total 4) - Product has @unique on barcode
  const products = await Promise.all([
    prisma.product.create({
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
              material_id: materials[0].id,
              material_quantity: 3,
              price: 300,
            },
            {
              material_id: materials[2].id,
              material_quantity: 0.5,
              price: 60,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Plastic Table",
        description: "Lightweight table",
        sale_price: 1800,
        wholesale_price: 1500,
        cost: 1300,
        stock: 10,
      },
    }),
    prisma.product.create({
      data: {
        name: "Wooden Cabinet",
        description: "Teak wood cabinet",
        sale_price: 5000,
        wholesale_price: 4500,
        cost: 4000,
        stock: 5,
      },
    }),
    prisma.product.create({
      data: {
        name: "Office Desk",
        description: "Executive office desk",
        sale_price: 7500,
        wholesale_price: 6500,
        cost: 5500,
        stock: 8,
      },
    }),
  ]);

  // --- LINK PRODUCTS TO STORE/SHOP ---
  // Store Products (4 stores × 4 products = 16 records)
  const storeProducts = [];
  for (const store of stores) {
    for (const product of products) {
      storeProducts.push(
        prisma.storeProduct.create({
          data: {
            store_id: store.id,
            product_id: product.id,
            stock: Math.floor(Math.random() * 50) + 10,
          },
        })
      );
    }
  }
  await Promise.all(storeProducts);

  // Shop Products (4 shops × 4 products = 16 records)
  const shopProducts = [];
  for (const shop of shops) {
    for (const product of products) {
      shopProducts.push(
        prisma.shopProduct.create({
          data: {
            shop_id: shop.id,
            product_id: product.id,
            stock: Math.floor(Math.random() * 20) + 5,
          },
        })
      );
    }
  }
  await Promise.all(shopProducts);

  // --- CASH REGISTERS --- (Total 4)
  const cashRegisters = await Promise.all([
    prisma.cashRegister.create({
      data: {
        name: "Main Cash Register",
        status: "active",
        cash_in_hand: 50000,
      },
    }),
    prisma.cashRegister.create({
      data: {
        name: "Gulshan Shop Register",
        status: "active",
        cash_in_hand: 30000,
      },
    }),
    prisma.cashRegister.create({
      data: {
        name: "Bashundhara Register",
        status: "closed",
        cash_in_hand: 0,
      },
    }),
    prisma.cashRegister.create({
      data: {
        name: "Motijheel Register",
        status: "active",
        cash_in_hand: 25000,
      },
    }),
  ]);

  // --- BANK ACCOUNTS --- (Total 4) - BankAccount has @unique on account_number
  const bankAccounts = await Promise.all([
    prisma.bankAccount.create({
      data: {
        name: "DBL Main Account",
        account_number: "1234567890",
        starting_balance: 100000,
        current_balance: 150000,
        withdraw_charge: 10,
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: "DBL Savings Account",
        account_number: "0987654321",
        starting_balance: 50000,
        current_balance: 75000,
        withdraw_charge: 5,
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: "DBL Business Account",
        account_number: "1122334455",
        starting_balance: 200000,
        current_balance: 180000,
        withdraw_charge: 15,
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: "DBL Emergency Fund",
        account_number: "5566778899",
        starting_balance: 100000,
        current_balance: 100000,
        withdraw_charge: 20,
      },
    }),
  ]);

  // --- ACCOUNTS --- (Total 4) - Accounts has @unique on account_number
  const accounts = await Promise.all([
    prisma.accounts.create({
      data: {
        name: "Petty Cash Account",
        account_number: "PC-001",
        balance: 50000,
        status: "active",
      },
    }),
    prisma.accounts.create({
      data: {
        name: "Main Operating Account",
        account_number: "MOA-001",
        balance: 500000,
        status: "active",
      },
    }),
    prisma.accounts.create({
      data: {
        name: "Expense Account",
        account_number: "EXP-001",
        balance: 100000,
        status: "active",
      },
    }),
    prisma.accounts.create({
      data: {
        name: "Revenue Account",
        account_number: "REV-001",
        balance: 750000,
        status: "active",
      },
    }),
  ]);

  // --- PURCHASE --- (Total 4) - Purchase has @unique on reference
  const purchases = await Promise.all([
    prisma.purchase.create({
      data: {
        reference: "PUR-001",
        supplierId: suppliers[0].id,
        destinationType: 'store',
        destinationId: stores[0].id,
        grandTotal: 30000,
        purchaseItems: {
          create: [
            {
              materialId: materials[0].id,
              quantity: 100,
              unitPrice: 100,
              totalPrice: 10000,
            },
            {
              materialId: materials[1].id,
              quantity: 200,
              unitPrice: 50,
              totalPrice: 10000,
            },
          ],
        },
      },
    }),
    prisma.purchase.create({
      data: {
        reference: "PUR-002",
        supplierId: suppliers[1].id,
        destinationType: 'shop',
        destinationId: shops[1].id,
        grandTotal: 45000,
        purchaseItems: {
          create: [
            {
              materialId: materials[2].id,
              quantity: 100,
              unitPrice: 120,
              totalPrice: 12000,
            },
            {
              productId: products[0].id,
              quantity: 20,
              unitPrice: 800,
              totalPrice: 16000,
            },
          ],
        },
      },
    }),
    prisma.purchase.create({
      data: {
        reference: "PUR-003",
        supplierId: suppliers[2].id,
        destinationType: 'factory',
        destinationId: factories[2].id,
        grandTotal: 25000,
        purchaseItems: {
          create: [
            {
              materialId: materials[3].id,
              quantity: 40,
              unitPrice: 500,
              totalPrice: 20000,
            },
          ],
        },
      },
    }),
    prisma.purchase.create({
      data: {
        reference: "PUR-004",
        supplierId: suppliers[3].id,
        destinationType: 'store',
        destinationId: stores[3].id,
        grandTotal: 38000,
        purchaseItems: {
          create: [
            {
              productId: products[2].id,
              quantity: 5,
              unitPrice: 4000,
              totalPrice: 20000,
            },
            {
              productId: products[3].id,
              quantity: 3,
              unitPrice: 6000,
              totalPrice: 18000,
            },
          ],
        },
      },
    }),
  ]);

  // --- PRODUCTION --- (Total 4) - Production has @unique on reference
  const productions = await Promise.all([
    prisma.production.create({
      data: {
        reference: "PROD-001",
        start_date: new Date('2024-01-15'),
        estimated_end_date: new Date('2024-01-30'),
        factoryId: factories[0].id,
        status: "done",
        productionProducts: {
          create: [
            {
              productId: products[0].id,
              code: "CHAIR-001",
              quantity: 50,
              unit_cost: 800,
              received: 48,
              scrap: 2,
            },
          ],
        },
        productionMaterials: {
          create: [
            {
              materialId: materials[0].id,
              quantity: 150,
              price: 100,
              scrap: 5,
            },
          ],
        },
      },
    }),
    prisma.production.create({
      data: {
        reference: "PROD-002",
        start_date: new Date('2024-02-01'),
        estimated_end_date: new Date('2024-02-15'),
        factoryId: factories[1].id,
        status: "running",
        productionProducts: {
          create: [
            {
              productId: products[1].id,
              code: "TABLE-001",
              quantity: 30,
              unit_cost: 1300,
              received: 25,
              scrap: 5,
            },
          ],
        },
      },
    }),
    prisma.production.create({
      data: {
        reference: "PROD-003",
        start_date: new Date('2024-02-10'),
        estimated_end_date: new Date('2024-02-25'),
        factoryId: factories[2].id,
        status: "pending",
      },
    }),
    prisma.production.create({
      data: {
        reference: "PROD-004",
        start_date: new Date('2024-03-01'),
        estimated_end_date: new Date('2024-03-20'),
        factoryId: factories[3].id,
        status: "done",
        end_date: new Date('2024-03-18'),
        productionProducts: {
          create: [
            {
              productId: products[3].id,
              code: "DESK-001",
              quantity: 20,
              unit_cost: 5500,
              received: 18,
              scrap: 2,
            },
          ],
        },
      },
    }),
  ]);

  // --- SALE --- (Total 4) - Sale has @unique on reference
  const sales = await Promise.all([
    prisma.sale.create({
      data: {
        reference: "SAL-001",
        shopId: shops[0].id,
        customer: "John Doe",
        totalAmount: 3000,
        discount: 0,
        grandTotal: 3000,
        paymentType: "cash",
        saleItems: {
          create: [
            {
              productId: products[0].id,
              quantity: 2,
              unitPrice: 1200,
              totalPrice: 2400,
            },
            {
              productId: products[1].id,
              quantity: 1,
              unitPrice: 600,
              totalPrice: 600,
            },
          ],
        },
      },
    }),
    prisma.sale.create({
      data: {
        reference: "SAL-002",
        shopId: shops[0].id,
        customer: "Jane Smith",
        totalAmount: 1800,
        discount: 100,
        grandTotal: 1700,
        paymentType: "card",
        saleItems: {
          create: [
            {
              productId: products[0].id,
              quantity: 1,
              unitPrice: 1200,
              totalPrice: 1200,
            },
            {
              materialId: materials[0].id,
              quantity: 5,
              unitPrice: 120,
              totalPrice: 600,
            },
          ],
        },
      },
    }),
    prisma.sale.create({
      data: {
        reference: "SAL-003",
        shopId: shops[0].id,
        customer: "Walk-in Customer",
        totalAmount: 360,
        discount: 0,
        grandTotal: 360,
        paymentType: "cash",
        saleItems: {
          create: [
            {
              materialId: materials[2].id,
              quantity: 3,
              unitPrice: 120,
              totalPrice: 360,
            },
          ],
        },
      },
    }),
    prisma.sale.create({
      data: {
        reference: "SAL-004",
        shopId: shops[1].id,
        customer: "Corporate Client Ltd.",
        totalAmount: 12000,
        discount: 1000,
        grandTotal: 11000,
        paymentType: "bank",
        saleItems: {
          create: [
            {
              productId: products[3].id,
              quantity: 1,
              unitPrice: 7500,
              totalPrice: 7500,
            },
            {
              productId: products[2].id,
              quantity: 1,
              unitPrice: 5000,
              totalPrice: 5000,
            },
          ],
        },
      },
    }),
  ]);

  // --- TRANSFERS --- (Total 4) - Transfer has @unique on reference
  const transfers = await Promise.all([
    prisma.transfer.create({
      data: {
        reference: "TRF-001",
        from: "store",
        fromId: stores[0].id,
        to: "shop",
        toId: shops[0].id,
        shipping_cost: 500,
        status: "processing",
        note: "Weekly restock",
        transferItems: {
          create: [
            {
              item: "product",
              itemId: products[0].id,
              quantity: 10,
            },
            {
              item: "material",
              itemId: materials[0].id,
              quantity: 50,
            },
          ],
        },
      },
    }),
    prisma.transfer.create({
      data: {
        reference: "TRF-002",
        from: "factory",
        fromId: factories[0].id,
        to: "store",
        toId: stores[1].id,
        shipping_cost: 1000,
        status: "processing",
        transferItems: {
          create: [
            {
              item: "product",
              itemId: products[1].id,
              quantity: 15,
            },
          ],
        },
      },
    }),
    prisma.transfer.create({
      data: {
        reference: "TRF-003",
        from: "store",
        fromId: stores[2].id,
        to: "shop",
        toId: shops[2].id,
        shipping_cost: 300,
        status: "processing",
        transferItems: {
          create: [
            {
              item: "product",
              itemId: products[2].id,
              quantity: 3,
            },
          ],
        },
      },
    }),
    prisma.transfer.create({
      data: {
        reference: "TRF-004",
        from: "factory",
        fromId: factories[3].id,
        to: "store",
        toId: stores[3].id,
        shipping_cost: 800,
        status: "processing",
        note: "New product delivery",
        transferItems: {
          create: [
            {
              item: "product",
              itemId: products[3].id,
              quantity: 5,
            },
          ],
        },
      },
    }),
  ]);

  // --- STORE TO SHOP TRANSFERS --- (Total 4) - StoreToShopTransfer has @unique on reference
  const storeToShopTransfers = await Promise.all([
    prisma.storeToShopTransfer.create({
      data: {
        reference: "STS-001",
        storeId: stores[0].id,
        shopId: shops[0].id,
        status: "transferred",
        totalItems: 2,
        transferItems: {
          create: [
            {
              productId: products[0].id,
              quantity: 5,
              type: "product",
            },
            {
              materialId: materials[0].id,
              quantity: 20,
              type: "material",
            },
          ],
        },
      },
    }),
    prisma.storeToShopTransfer.create({
      data: {
        reference: "STS-002",
        storeId: stores[1].id,
        shopId: shops[1].id,
        status: "being_shipped",
        totalItems: 1,
        transferItems: {
          create: [
            {
              productId: products[1].id,
              quantity: 8,
              type: "product",
            },
          ],
        },
      },
    }),
    prisma.storeToShopTransfer.create({
      data: {
        reference: "STS-003",
        storeId: stores[2].id,
        shopId: shops[2].id,
        status: "pending",
        totalItems: 1,
        transferItems: {
          create: [
            {
              productId: products[2].id,
              quantity: 2,
              type: "product",
            },
          ],
        },
      },
    }),
    prisma.storeToShopTransfer.create({
      data: {
        reference: "STS-004",
        storeId: stores[3].id,
        shopId: shops[3].id,
        status: "transferred",
        totalItems: 2,
        transferItems: {
          create: [
            {
              productId: products[3].id,
              quantity: 3,
              type: "product",
            },
            {
              materialId: materials[2].id,
              quantity: 10,
              type: "material",
            },
          ],
        },
      },
    }),
  ]);

  // --- NOTIFICATIONS --- (Total 4)
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        title: "Low Stock Alert",
        description: "Steel Rod is below minimum stock level",
        link: "/materials",
        forRole: "store_keeper",
      },
    }),
    prisma.notification.create({
      data: {
        title: "New Order Received",
        description: "Order #SAL-004 from Corporate Client Ltd.",
        link: "/sales/SAL-004",
        forRole: "manager",
      },
    }),
    prisma.notification.create({
      data: {
        title: "Production Completed",
        description: "Production PROD-001 has been completed",
        link: "/productions/PROD-001",
        forRole: "manager",
      },
    }),
    prisma.notification.create({
      data: {
        title: "System Update",
        description: "System maintenance scheduled for tonight",
        link: "/settings",
        forRole: "admin",
      },
    }),
  ]);

  // --- CASH REGISTER ASSIGNMENTS --- (Total 4)
  const cashRegisterAssignments = await Promise.all([
    prisma.cashRegisterAssignment.create({
      data: {
        entityType: "shop",
        entityId: shops[0].id,
        cashRegisterId: cashRegisters[0].id,
        assignedById: admin.id,
        notes: "Main shop register",
      },
    }),
    prisma.cashRegisterAssignment.create({
      data: {
        entityType: "shop",
        entityId: shops[1].id,
        cashRegisterId: cashRegisters[1].id,
        assignedById: admin.id,
        notes: "Gulshan branch",
      },
    }),
    prisma.cashRegisterAssignment.create({
      data: {
        entityType: "store",
        entityId: stores[0].id,
        cashRegisterId: cashRegisters[2].id,
        assignedById: user3.id,
        notes: "Store petty cash",
      },
    }),
    prisma.cashRegisterAssignment.create({
      data: {
        entityType: "factory",
        entityId: factories[0].id,
        cashRegisterId: cashRegisters[3].id,
        assignedById: admin.id,
        notes: "Factory cash handling",
      },
    }),
  ]);

  // --- ENTITY ACCOUNTS --- (Total 4)
  const entityAccounts = await Promise.all([
    prisma.entityAccount.create({
      data: {
        entityType: "shop",
        entityId: shops[0].id,
        accountId: accounts[0].id,
        isPrimary: true,
        assignedById: admin.id,
      },
    }),
    prisma.entityAccount.create({
      data: {
        entityType: "store",
        entityId: stores[0].id,
        accountId: accounts[1].id,
        isPrimary: true,
        assignedById: admin.id,
      },
    }),
    prisma.entityAccount.create({
      data: {
        entityType: "factory",
        entityId: factories[0].id,
        accountId: accounts[2].id,
        isPrimary: true,
        assignedById: user3.id,
      },
    }),
    prisma.entityAccount.create({
      data: {
        entityType: "shop",
        entityId: shops[1].id,
        accountId: accounts[3].id,
        isPrimary: false,
        assignedById: admin.id,
      },
    }),
  ]);

  // --- USER ASSOCIATES --- (Total 4)
  const userAssociates = await Promise.all([
    prisma.userAssociate.create({
      data: {
        userId: user3.id,
        associateName: "store",
        associateId: stores[0].id,
      },
    }),
    prisma.userAssociate.create({
      data: {
        userId: user4.id,
        associateName: "shop",
        associateId: shops[0].id,
      },
    }),
    prisma.userAssociate.create({
      data: {
        userId: admin.id,
        associateName: "factory",
        associateId: factories[0].id,
      },
    }),
    prisma.userAssociate.create({
      data: {
        userId: user4.id,
        associateName: "cashRegister",
        associateId: cashRegisters[0].id,
      },
    }),
  ]);

  console.log("✅ Seeding completed successfully!");
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
  console.log(`Created ${await prisma.storeToShopTransfer.count()} store-to-shop transfers`);
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