const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const countDaysInRangeWithinMonth = (startDate, endDate, year, month) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth(year, month), 23, 59, 59);
  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;
  if (to < from) return 0;
  const diff = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
};

const generateMonthlySalaries = async (year, month) => {
  const profiles = await prisma.employeeProfile.findMany({
    where: { status: "active" },
    include: { user: true }
  });

  for (const profile of profiles) {
    const exists = await prisma.salary.findUnique({
      where: { userId_month_year: { userId: profile.userId, month, year } }
    });
    if (exists) continue;

    const baseSalary = parseFloat(profile.baseSalary) || 0;
    const monthDays = daysInMonth(year, month);
    const dailyRate = monthDays ? baseSalary / monthDays : 0;

    const unpaidLeaves = await prisma.leaveRequest.findMany({
      where: {
        userId: profile.userId,
        status: "approved",
        category: { isPaid: false },
        OR: [
          { startDate: { lte: new Date(year, month, 0) }, endDate: { gte: new Date(year, month - 1, 1) } }
        ]
      },
      include: { category: true }
    });

    const unpaidDays = unpaidLeaves.reduce((sum, leave) => {
      return sum + countDaysInRangeWithinMonth(leave.startDate, leave.endDate, year, month);
    }, 0);

    const deductions = Number((unpaidDays * dailyRate).toFixed(2));
    const gross = Number((baseSalary).toFixed(2));
    const net = Number((gross - deductions).toFixed(2));

    await prisma.salary.create({
      data: {
        userId: profile.userId,
        month,
        year,
        baseSalary: gross,
        allowances: 0,
        deductions,
        gross,
        net,
        status: "generated"
      }
    });
  }
};

const startSalaryCron = () => {
  cron.schedule("0 0 1 * *", async () => {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    await generateMonthlySalaries(year, month);
  });
};

module.exports = {
  startSalaryCron,
  generateMonthlySalaries
};
