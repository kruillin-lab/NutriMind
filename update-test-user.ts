import { prisma } from "./src/lib/prisma";

async function updateTestUser() {
  try {
    // First find the user
    const user = await prisma.user.findUnique({
      where: { id: "user_2w1nMNM9UgrKqC8X" },
      include: {
        profile: true,
      }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Found user:', user.email);
    console.log('Current profile:', user.profile);
    
    // Create or update the profile with heightCm
    if (!user.profile) {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          heightCm: 170,
          birthDate: new Date('1990-01-01'),
          gender: 'OTHER',
          activityLevel: 'MODERATE',
        }
      });
      console.log('Created profile with heightCm: 170');
    } else {
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          heightCm: 170,
        }
      });
      console.log('Updated profile with heightCm: 170');
    }
    
    // Also create metabolic profile if needed
    const metabolic = await prisma.metabolicProfile.findUnique({
      where: { userId: user.id }
    });
    
    if (!metabolic) {
      await prisma.metabolicProfile.create({
        data: {
          userId: user.id,
          trueMetabolicRate: 2000,
          bmrEstimate: 1800,
        }
      });
      console.log('Created metabolic profile');
    }
    
    // Also create calorie bank if needed
    const bank = await prisma.calorieBank.findUnique({
      where: { userId: user.id }
    });
    
    if (!bank) {
      await prisma.calorieBank.create({
        data: {
          userId: user.id,
          currentBalance: 0,
          totalBanked: 0,
          totalSpent: 0,
          dailyTarget: 2000,
        }
      });
      console.log('Created calorie bank');
    }
    
    console.log('\nTest user is now ready for dashboard access!');
    
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

updateTestUser();
