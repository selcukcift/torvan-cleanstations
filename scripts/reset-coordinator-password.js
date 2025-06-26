const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetCoordinatorPassword() {
  try {
    const email = 'production@torvanmedical.com';
    const newPassword = 'password123';
    
    console.log('\n🔐 Resetting password for Production Coordinator...');
    console.log('   Email:', email);
    console.log('   New Password:', newPassword);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { passwordHash },
      select: {
        email: true,
        username: true,
        fullName: true,
        role: true
      }
    });
    
    console.log('\n✅ Password reset successful!');
    console.log('   Username:', updatedUser.username);
    console.log('   Full Name:', updatedUser.fullName);
    console.log('   Role:', updatedUser.role);
    console.log('\n📝 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetCoordinatorPassword();