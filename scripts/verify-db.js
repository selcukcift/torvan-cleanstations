const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database state...\n');
    
    // Count records in each table
    const counts = {
      users: await prisma.user.count(),
      parts: await prisma.part.count(),
      assemblies: await prisma.assembly.count(),
      categories: await prisma.category.count(),
      subcategories: await prisma.subcategory.count(),
      qcTemplates: await prisma.qcFormTemplate.count(),
      qcTemplateItems: await prisma.qcFormTemplateItem.count(),
      workInstructions: await prisma.workInstruction.count(),
      tools: await prisma.tool.count(),
      orders: await prisma.order.count(),
    };
    
    console.log('📊 Database Record Counts:');
    console.log('========================');
    console.log(`✅ Users: ${counts.users}`);
    console.log(`✅ Parts: ${counts.parts}`);
    console.log(`✅ Assemblies: ${counts.assemblies}`);
    console.log(`✅ Categories: ${counts.categories}`);
    console.log(`✅ Subcategories: ${counts.subcategories}`);
    console.log(`✅ QC Templates: ${counts.qcTemplates}`);
    console.log(`✅ QC Template Items: ${counts.qcTemplateItems}`);
    console.log(`✅ Work Instructions: ${counts.workInstructions}`);
    console.log(`✅ Tools: ${counts.tools}`);
    console.log(`✅ Orders: ${counts.orders}`);
    
    // Check for pegboard kits
    const pegboardKits = await prisma.assembly.count({
      where: {
        assemblyId: {
          contains: 'PB'
        }
      }
    });
    
    console.log(`\n🎯 Pegboard Kits: ${pegboardKits}`);
    
    // List users
    const users = await prisma.user.findMany({
      select: {
        username: true,
        role: true,
        email: true
      }
    });
    
    console.log('\n👥 Users:');
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.email}`);
    });
    
    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();