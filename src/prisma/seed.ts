import { PrismaClient, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Keep seeding deterministic for assignment demos.
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();

  // ─── Users ────────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@finance.dev' },
    update: {},
    create: { name: 'Admin User', email: 'admin@finance.dev', password: hashedPassword, role: 'ADMIN' },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@finance.dev' },
    update: {},
    create: { name: 'Analyst User', email: 'analyst@finance.dev', password: hashedPassword, role: 'ANALYST' },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@finance.dev' },
    update: {},
    create: { name: 'Viewer User', email: 'viewer@finance.dev', password: hashedPassword, role: 'VIEWER' },
  });

  console.log('✅ Users seeded');

  // ─── Transactions ─────────────────────────────────────────────────────────────
  // Generate realistic data across 6 months so trends are meaningful
  const categories = {
    EXPENSE: ['Salaries', 'Rent', 'Utilities', 'Marketing', 'Software', 'Travel', 'Office Supplies'],
    INCOME:  ['Product Sales', 'Consulting', 'Subscriptions', 'Licensing', 'Services'],
  };

  const transactions: Array<{
    amount: number;
    type: TransactionType;
    category: string;
    date: Date;
    notes: string;
    createdById: string;
  }> = [];

  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - monthOffset);

    // 3–5 income entries per month
    const incomeCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < incomeCount; i++) {
      const cat = categories.INCOME[Math.floor(Math.random() * categories.INCOME.length)];
      transactions.push({
        amount: parseFloat((5000 + Math.random() * 20000).toFixed(2)),
        type: TransactionType.INCOME,
        category: cat,
        date: randomDateInMonth(baseDate),
        notes: `${cat} payment for ${monthName(baseDate)}`,
        createdById: admin.id,
      });
    }

    // 5–8 expense entries per month
    const expenseCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < expenseCount; i++) {
      const cat = categories.EXPENSE[Math.floor(Math.random() * categories.EXPENSE.length)];
      transactions.push({
        amount: parseFloat((500 + Math.random() * 8000).toFixed(2)),
        type: TransactionType.EXPENSE,
        category: cat,
        date: randomDateInMonth(baseDate),
        notes: `${cat} expense for ${monthName(baseDate)}`,
        createdById: analyst.id,
      });
    }
  }

  await prisma.transaction.createMany({ data: transactions });
  console.log(`✅ ${transactions.length} transactions seeded`);

  console.log('\n🎉 Seed complete! Test credentials:');
  console.log('  Admin:   admin@finance.dev   / Password123');
  console.log('  Analyst: analyst@finance.dev / Password123');
  console.log('  Viewer:  viewer@finance.dev  / Password123');
}

function randomDateInMonth(base: Date): Date {
  const d = new Date(base);
  d.setDate(1 + Math.floor(Math.random() * 28));
  return d;
}

function monthName(d: Date): string {
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());