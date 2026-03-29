import { prisma } from "./src/lib/prisma";

async function test() {
  try {
    const count = await prisma.cachedFood.count();
    console.log('CachedFood table exists! Count:', count);
    
    const foods = await prisma.cachedFood.findMany({
      orderBy: { hitCount: 'desc' },
      take: 6
    });
    console.log('Foods found:', foods.length);
    console.log('Foods:', foods);
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
