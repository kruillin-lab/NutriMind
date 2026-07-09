import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    // Check if table exists by trying to query
    const count = await prisma.cachedFood.count();
    console.log('CachedFood table exists! Count:', count);
    
    // Get all foods
    const foods = await prisma.cachedFood.findMany({
      orderBy: { hitCount: 'desc' },
      take: 6
    });
    console.log('Foods found:', foods.length);
    console.log('Foods:', foods);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
