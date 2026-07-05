import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  try {
    const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('Tables in database:');
    result.forEach(row => console.log(`  - ${row.name}`));
    
    // Check CachedFood count
    try {
      const count = await prisma.cachedFood.count();
      console.log(`\nCachedFood entries: ${count}`);
    } catch (e) {
      console.log('\nCachedFood table error:', e.message);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
