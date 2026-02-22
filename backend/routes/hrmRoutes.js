const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { generateMonthlySalaries } = require("../services/salaryCron");
const { createTransaction } = require("../utils/transactionHelper");
const SALARY_STATUSES = ["generated", "created", "approve", "approved", "paid"];

const userHasPermission = async (userId, permission) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permission: true },
  });
  if (!user || !user.permission) return false;
  if (["admin", "superadmin"].includes(user.permission.name)) return true;
  const perms = user.permission.permissions || [];
  return perms.includes(permission);
};

const isManagerOf = async (managerId, userId) => {
  const relation = await prisma.userManager.findFirst({
    where: { managerId, userId }
  });
  return !!relation;
};

// Search users by name, email, or username (with authentication)
router.get("/users/search", async (req, res) => {
  try {
    console.log('Search endpoint called with query:', req.query);
    
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchQuery = query.trim();
    
    // SIMPLE search without complex conditions
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery } },
          { email: { contains: searchQuery } },
          { username: { contains: searchQuery } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true
      },
      take: 10
    });

    console.log('Search results:', users.length);
    res.json(users);
  } catch (err) {
    console.error('Search error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    
    // Return empty array instead of error for frontend compatibility
    res.json([]);
  }
});

// Alternative: Direct database query if Prisma is having issues
router.get("/users/search-simple", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchQuery = `%${query.trim()}%`;
    
    // Using raw query as fallback
    const users = await prisma.$queryRaw`
      SELECT id, name, email, username
      FROM User
      WHERE name LIKE ${searchQuery}
         OR email LIKE ${searchQuery}
         OR username LIKE ${searchQuery}
      LIMIT 10
    `;

    res.json(users);
  } catch (err) {
    console.error('Raw search error:', err);
    res.json([]);
  }
});


// Get user's manager
router.get("/employees/:userId/manager", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const relation = await prisma.userManager.findFirst({
      where: { userId, isPrimary: true },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        }
      }
    });

    if (!relation) {
      return res.json(null);
    }

    res.json(relation.manager);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employees (profiles)
router.get("/employees", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        employeeProfile: true,
        managerOf: { include: { user: true } },
        reportsTo: { include: { manager: true } }
      },
      orderBy: { id: "asc" }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alternative search endpoint for employees only
router.get("/employees/search", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchQuery = query.trim();
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery } },
          { email: { contains: searchQuery } },
          { username: { contains: searchQuery } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true
      },
      take: 10
    });

    res.json(users);
  } catch (err) {
    console.error('Employee search error:', err);
    res.json([]);
  }
});


router.post("/employees", async (req, res) => {
  try {
    const { userId, designation, baseSalary, salaryType, joiningDate, status } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const profile = await prisma.employeeProfile.upsert({
      where: { userId: parseInt(userId) },
      create: {
        userId: parseInt(userId),
        designation: designation || null,
        baseSalary: parseFloat(baseSalary) || 0,
        salaryType: salaryType || "monthly",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || "active"
      },
      update: {
        designation: designation || null,
        baseSalary: parseFloat(baseSalary) || 0,
        salaryType: salaryType || "monthly",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || "active"
      }
    });

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/employees/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { designation, baseSalary, salaryType, joiningDate, status } = req.body;
    const profile = await prisma.employeeProfile.update({
      where: { userId },
      data: {
        designation: designation || null,
        baseSalary: parseFloat(baseSalary) || 0,
        salaryType: salaryType || "monthly",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || "active"
      }
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/employees/:userId/manager", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { managerId, isPrimary = true } = req.body;
    if (!managerId) return res.status(400).json({ error: "managerId is required" });

    const relation = await prisma.userManager.upsert({
      where: {
        userId_managerId: { userId, managerId: parseInt(managerId) }
      },
      create: { userId, managerId: parseInt(managerId), isPrimary: !!isPrimary },
      update: { isPrimary: !!isPrimary }
    });

    res.json(relation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clock in/out
router.post("/clock-in", async (req, res) => {
  try {
    const userId = req.user.userId;
    const open = await prisma.clockInOut.findFirst({
      where: { userId, status: "open" }
    });
    if (open) return res.status(400).json({ error: "Already clocked in" });

    const record = await prisma.clockInOut.create({
      data: { userId, clockIn: new Date(), status: "open" }
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/clock-out", async (req, res) => {
  try {
    const userId = req.user.userId;
    const open = await prisma.clockInOut.findFirst({
      where: { userId, status: "open" },
      orderBy: { clockIn: "desc" }
    });
    if (!open) return res.status(400).json({ error: "No active clock-in found" });

    const record = await prisma.clockInOut.update({
      where: { id: open.id },
      data: { clockOut: new Date(), status: "closed" }
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/clock-records", async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const requesterId = req.user.userId;
    const canViewAll = await userHasPermission(requesterId, "approve_clock_in_out") || await userHasPermission(requesterId, "clock_in_out_manage");

    const where = {};
    if (userId && (canViewAll || parseInt(userId) === requesterId)) {
      where.userId = parseInt(userId);
    } else if (!canViewAll) {
      where.userId = requesterId;
    }
    if (startDate || endDate) {
      where.clockIn = {};
      if (startDate) where.clockIn.gte = new Date(startDate);
      if (endDate) where.clockIn.lte = new Date(endDate);
    }

    const records = await prisma.clockInOut.findMany({
      where,
      include: { user: true, approvedBy: true },
      orderBy: { clockIn: "desc" }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Holidays
router.get("/holidays", async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/holidays", async (req, res) => {
  try {
    const { name, date, isPaid, description } = req.body;
    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        isPaid: isPaid !== undefined ? !!isPaid : true,
        description: description || null
      }
    });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/holidays/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, date, isPaid, description } = req.body;
    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name,
        date: new Date(date),
        isPaid: isPaid !== undefined ? !!isPaid : true,
        description: description || null
      }
    });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/holidays/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.holiday.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//get Leave categories
router.get("/leave-categories", async (req, res) => {
  try {
    const categories = await prisma.leaveCategory.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//create Leave categories
router.post("/leave-categories", async (req, res) => {
  try {
    const { name, isPaid, maxDays } = req.body;
    const category = await prisma.leaveCategory.create({
      data: {
        name,
        isPaid: isPaid !== undefined ? !!isPaid : true,
        maxDays: maxDays ? parseInt(maxDays) : null
      }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//update Leave categories
router.put("/leave-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, isPaid, maxDays } = req.body;
    const category = await prisma.leaveCategory.update({
      where: { id },
      data: {
        name,
        isPaid: isPaid !== undefined ? !!isPaid : true,
        maxDays: maxDays ? parseInt(maxDays) : null
      }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// delete Leave categories
router.delete("/leave-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.leaveCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave requests
router.post("/leave-requests", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { categoryId, startDate, endDate, reason } = req.body;
    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        categoryId: parseInt(categoryId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null
      }
    });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// get all Leave requests
router.get("/leave-requests", async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const canApproveAll = await userHasPermission(requesterId, "leave_approve_all");
    const canApprove = await userHasPermission(requesterId, "leave_approve");

    let where = {};
    if (!canApproveAll) {
      if (canApprove) {
        const managedUsers = await prisma.userManager.findMany({
          where: { managerId: requesterId },
          select: { userId: true }
        });
        const ids = managedUsers.map(m => m.userId);
        where = { userId: { in: ids.length ? ids : [-1] } };
      } else {
        where = { userId: requesterId };
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { user: true, category: true, approvals: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// update approved Leave requests
router.put("/leave-requests/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const approverId = req.user.userId;
    const canApproveAll = await userHasPermission(approverId, "leave_approve_all");
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (!canApproveAll) {
      const isManager = await isManagerOf(approverId, leave.userId);
      if (!isManager) return res.status(403).json({ error: "Not authorized to approve this leave" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const leaveReq = await tx.leaveRequest.update({
        where: { id },
        data: { status: "approved" }
      });
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId,
          status: "approved",
          note: req.body.note || null
        }
      });
      return leaveReq;
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// update reject Leave requests
router.put("/leave-requests/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const approverId = req.user.userId;
    const canApproveAll = await userHasPermission(approverId, "leave_approve_all");
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (!canApproveAll) {
      const isManager = await isManagerOf(approverId, leave.userId);
      if (!isManager) return res.status(403).json({ error: "Not authorized to reject this leave" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const leaveReq = await tx.leaveRequest.update({
        where: { id },
        data: { status: "rejected" }
      });
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId,
          status: "rejected",
          note: req.body.note || null
        }
      });
      return leaveReq;
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payroll / Salaries
router.get("/payroll", async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) : null;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const where = {};
    if (month) where.month = month;
    if (year) where.year = year;
    const salaries = await prisma.salary.findMany({
      where,
      include: { user: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update Payroll / Salaries
router.put("/payroll/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { allowances, deductions, status, accountId } = req.body;
    const normalizedStatus = status !== undefined && status !== null
      ? String(status).trim().toLowerCase()
      : undefined;
    if (normalizedStatus && !SALARY_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid salary status" });
    }
    const finalStatus = normalizedStatus === "approved" ? "approve" : normalizedStatus;

    const existingSalary = await prisma.salary.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!existingSalary) {
      return res.status(404).json({ error: "Salary not found" });
    }

    const existingStatus = (existingSalary.status || "").toLowerCase();
    if (existingStatus === "paid") {
      return res.status(400).json({ error: "Paid salary cannot be edited" });
    }

    if (finalStatus === "paid" && !["approve", "approved"].includes(existingStatus)) {
      return res.status(400).json({ error: "Salary must be approved before marking as paid" });
    }

    const parsedAccountId = accountId !== undefined && accountId !== null && String(accountId).trim() !== ""
      ? parseInt(accountId)
      : null;

    if (finalStatus === "paid" && !parsedAccountId) {
      return res.status(400).json({ error: "accountId is required when status is paid" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const nextAllowances = allowances !== undefined ? parseFloat(allowances) || 0 : (existingSalary.allowances || 0);
      const nextDeductions = deductions !== undefined ? parseFloat(deductions) || 0 : (existingSalary.deductions || 0);
      const nextGross = (existingSalary.baseSalary || 0) + nextAllowances;
      const nextNet = nextGross - nextDeductions;

      const updatedSalary = await tx.salary.update({
        where: { id },
        data: {
          allowances: allowances !== undefined ? nextAllowances : undefined,
          deductions: deductions !== undefined ? nextDeductions : undefined,
          status: finalStatus || undefined,
          gross: nextGross,
          net: nextNet
        },
        include: { user: true }
      });

      if (finalStatus === "paid") {
        const account = await tx.accounts.findUnique({ where: { id: parsedAccountId } });
        if (!account) {
          throw new Error("Account not found");
        }

        const updatedAccount = await tx.accounts.update({
          where: { id: parsedAccountId },
          data: { balance: { decrement: nextNet } }
        });

        const employeeName = updatedSalary.user?.name || updatedSalary.user?.username || `User#${updatedSalary.userId}`;

        await createTransaction(tx, {
          reference: `TRX-SAL-${Date.now()}-${updatedSalary.id}`,
          createdById: req.user?.userId || existingSalary.userId || 1,
          accountId: parsedAccountId,
          purpose: "Salary Payment",
          added_to_account: false,
          amount: nextNet,
          payment_method: "salary",
          current_account_balance: updatedAccount.balance,
          note: `Salary payment ${updatedSalary.month}/${updatedSalary.year} - ${employeeName}`
        });
      }

      return updatedSalary;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual salary calculation fallback (if cron fails)
router.post("/payroll/calculate", async (req, res) => {
  try {
    const now = new Date();
    const month = req.body?.month ? parseInt(req.body.month) : (now.getMonth() + 1);
    const year = req.body?.year ? parseInt(req.body.year) : now.getFullYear();
    if (!month || month < 1 || month > 12 || !year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: "Invalid month/year" });
    }

    await generateMonthlySalaries(year, month);
    const createdCount = await prisma.salary.count({ where: { month, year } });

    res.json({
      success: true,
      message: `Salary calculation completed for ${month}/${year}`,
      month,
      year,
      totalRecords: createdCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
