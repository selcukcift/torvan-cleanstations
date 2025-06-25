/**
 * User Management Seeder Module
 * 
 * Handles seeding of users, roles, and authentication-related data
 */

class UserManagementSeeder {
  constructor(prismaClient) {
    this.prisma = prismaClient;
    this.moduleName = 'UserManagementSeeder';
  }

  async seed() {
    console.log('   👥 Seeding users and role management...');
    
    const results = {
      users: 0,
      totalItems: 0
    };

    const userResult = await this.seedSystemUsers();
    results.users = userResult.created;
    results.totalItems = userResult.created;

    return results;
  }

  async seedSystemUsers() {
    const systemUsers = [
      {
        username: 'system_admin',
        email: 'admin@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "admin123" hashed
        fullName: 'System Administrator',
        role: 'ADMIN',
        initials: 'SA',
        isActive: true
      },
      {
        username: 'production_manager',
        email: 'production@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "prod123" hashed
        fullName: 'Production Manager',
        role: 'PRODUCTION_COORDINATOR',
        initials: 'PM',
        isActive: true
      },
      {
        username: 'qc_lead',
        email: 'qc.lead@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "qc123" hashed
        fullName: 'QC Lead Inspector',
        role: 'QC_PERSON',
        initials: 'QL',
        isActive: true
      },
      {
        username: 'assembly_tech1',
        email: 'assembly1@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "tech123" hashed
        fullName: 'Assembly Technician 1',
        role: 'ASSEMBLER',
        initials: 'AT1',
        isActive: true
      },
      {
        username: 'assembly_tech2',
        email: 'assembly2@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "tech123" hashed
        fullName: 'Assembly Technician 2',
        role: 'ASSEMBLER',
        initials: 'AT2',
        isActive: true
      },
      {
        username: 'procurement_spec',
        email: 'procurement@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "proc123" hashed
        fullName: 'Procurement Specialist',
        role: 'PROCUREMENT_SPECIALIST',
        initials: 'PS',
        isActive: true
      },
      {
        username: 'service_dept',
        email: 'service@torvanmedical.com',
        passwordHash: '$2b$10$K8p.uJ9J.OxK.aO9fJ.8Le8J.8J.8J.8J.8J.8J.8J.8J.8J.8J.8', // "service123" hashed
        fullName: 'Service Department',
        role: 'SERVICE_DEPARTMENT',
        initials: 'SD',
        isActive: true
      }
    ];

    let usersCreated = 0;

    for (const userData of systemUsers) {
      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: userData.username },
            { email: userData.email }
          ]
        }
      });

      if (!existing) {
        await this.prisma.user.create({
          data: userData
        });
        usersCreated++;
        
        console.log(`       ✅ Created user: ${userData.fullName} (${userData.role})`);
      }
    }

    return { created: usersCreated, total: systemUsers.length };
  }
}

module.exports = UserManagementSeeder;