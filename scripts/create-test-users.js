#!/usr/bin/env node

/**
 * Create Test User Script
 * Creates a test user for development purposes
 */

const axios = require('axios');

async function createTestUser() {
  const testUser = {
    username: 'admin',
    email: 'admin@torvanmedical.com',
    password: 'admin123',
    fullName: 'System Administrator',
    role: 'ADMIN',
    initials: 'SA'
  };

  try {
    console.log('Creating test user...');
    
    const response = await axios.post('http://localhost:3004/api/auth/register', testUser, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Test user created successfully!');
    console.log('Login credentials:');
    console.log(`Username: ${testUser.username}`);
    console.log(`Password: ${testUser.password}`);
    console.log(`Role: ${testUser.role}`);
    console.log('\nYou can now log in to the frontend at http://localhost:3000');
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  Test user already exists. Login credentials:');
      console.log(`Username: ${testUser.username}`);
      console.log(`Password: ${testUser.password}`);
      console.log(`Role: ${testUser.role}`);
    } else {
      console.error('❌ Error creating test user:', error.response?.data || error.message);
    }
  }
}

// Also create users for other roles
async function createAllTestUsers() {
  const users = [
    {
      username: 'admin',
      email: 'admin@torvanmedical.com',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'ADMIN',
      initials: 'SA'
    },
    {
      username: 'coordinator',
      email: 'coordinator@torvanmedical.com',
      password: 'coord123',
      fullName: 'Production Coordinator',
      role: 'PRODUCTION_COORDINATOR',
      initials: 'PC'
    },
    {
      username: 'procurement',
      email: 'procurement@torvanmedical.com',
      password: 'proc123',
      fullName: 'Procurement Specialist',
      role: 'PROCUREMENT_SPECIALIST',
      initials: 'PS'
    },
    {
      username: 'qc',
      email: 'qc@torvanmedical.com',
      password: 'qc123',
      fullName: 'QC Inspector',
      role: 'QC_PERSON',
      initials: 'QC'
    },
    {
      username: 'assembler',
      email: 'assembler@torvanmedical.com',
      password: 'asm123',
      fullName: 'Production Assembler',
      role: 'ASSEMBLER',
      initials: 'PA'
    }
  ];

  console.log('Creating test users for all roles...\n');

  for (const user of users) {
    try {
      const response = await axios.post('http://localhost:3004/api/auth/register', user, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Created ${user.role}: ${user.username} (${user.fullName})`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️  ${user.role} user already exists: ${user.username}`);
      } else {
        console.error(`❌ Error creating ${user.role}:`, error.response?.data || error.message);
      }
    }
  }

  console.log('\n🎉 Test users setup complete!');
  console.log('\nLogin Credentials:');
  users.forEach(user => {
    console.log(`${user.role}: ${user.username} / ${user.password}`);
  });
  console.log('\nAccess the app at: http://localhost:3000');
}

if (require.main === module) {
  createAllTestUsers();
}

module.exports = { createTestUser, createAllTestUsers };
