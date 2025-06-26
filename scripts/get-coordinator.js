const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCoordinatorCredentials() {
  try {
    const coordinator = await prisma.user.findFirst({
      where: {
        role: 'PRODUCTION_COORDINATOR'
      },
      select: {
        email: true,
        username: true,
        fullName: true,
        role: true
      }
    });

    if (coordinator) {
      console.log('\n✅ Production Coordinator Credentials:');
      console.log('   Email:', coordinator.email);
      console.log('   Username:', coordinator.username);
      console.log('   Full Name:', coordinator.fullName);
      console.log('   Role:', coordinator.role);
      console.log('\n   Default Password: password123');
      console.log('   (This is the default password used in seeding scripts)\n');
    } else {
      console.log('\n❌ No Production Coordinator found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCoordinatorCredentials();