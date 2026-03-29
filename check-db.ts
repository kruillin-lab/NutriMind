import { prisma } from "./src/lib/prisma";

async function checkDb() {
  try {
    const users = await prisma.user.findMany({ 
      take: 10,
      include: {
        profile: true
      }
    });
    
    console.log('Users in database:', users.length);
    users.forEach(u => {
      console.log('ID:', u.id);
      console.log('Email:', u.email);
      console.log('Has profile:', !!u.profile);
      console.log('Height:', u.profile?.heightCm);
      console.log('---');
    });
    
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
