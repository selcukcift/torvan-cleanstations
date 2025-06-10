#!/usr/bin/env node

// Automatic environment detection script
// Detects work vs home environment and switches database config accordingly

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK_POSTGRES_IP = '172.16.16.61';
const WORK_POSTGRES_PORT = 5432;
const TIMEOUT_MS = 3000;

async function checkWorkPostgreSQL() {
  return new Promise((resolve) => {
    const cmd = `timeout ${TIMEOUT_MS / 1000} bash -c "echo > /dev/tcp/${WORK_POSTGRES_IP}/${WORK_POSTGRES_PORT}"`;
    
    exec(cmd, (error) => {
      if (error) {
        console.log(`🏠 Work PostgreSQL (${WORK_POSTGRES_IP}:${WORK_POSTGRES_PORT}) not reachable - assuming HOME environment`);
        resolve(false);
      } else {
        console.log(`🏢 Work PostgreSQL (${WORK_POSTGRES_IP}:${WORK_POSTGRES_PORT}) reachable - detected WORK environment`);
        resolve(true);
      }
    });
  });
}

async function getCurrentEnvironment() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    if (envContent.includes(WORK_POSTGRES_IP)) {
      return 'work';
    } else if (envContent.includes('localhost')) {
      return 'home';
    }
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

async function switchEnvironment(targetEnv) {
  const sourceFile = `.env.${targetEnv}`;
  const targetFile = '.env.local';
  
  try {
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Environment file ${sourceFile} not found`);
      return false;
    }
    
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✅ Switched to ${targetEnv.toUpperCase()} environment`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to switch environment: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Auto-detecting environment...');
  
  const currentEnv = await getCurrentEnvironment();
  console.log(`📍 Current environment: ${currentEnv.toUpperCase()}`);
  
  const isWorkReachable = await checkWorkPostgreSQL();
  const targetEnv = isWorkReachable ? 'work' : 'home';
  
  if (currentEnv === targetEnv) {
    console.log(`✅ Already configured for ${targetEnv.toUpperCase()} environment - no change needed`);
    return;
  }
  
  console.log(`🔄 Switching from ${currentEnv.toUpperCase()} to ${targetEnv.toUpperCase()}...`);
  const success = await switchEnvironment(targetEnv);
  
  if (success) {
    console.log(`🎉 Environment auto-detection complete! Ready for ${targetEnv.toUpperCase()} development.`);
  } else {
    console.error('❌ Auto-detection failed. Please manually switch using npm run env:work or npm run env:home');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Auto-detection script failed:', error.message);
  process.exit(1);
});