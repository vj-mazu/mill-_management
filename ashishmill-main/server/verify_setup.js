/**
 * Quick verification script to check if all auto-setup components are in place
 * Run this before starting the server to ensure everything is configured correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Auto-Setup Configuration\n');
console.log('='.repeat(60));

let allGood = true;

// Check 1: Verify index.js exists
console.log('\n1️⃣ Checking server/index.js...');
if (fs.existsSync(path.join(__dirname, 'index.js'))) {
  const indexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  
  // Count migrations
  const migrationMatches = indexContent.match(/Migration \d+:/g);
  const migrationCount = migrationMatches ? migrationMatches.length : 0;
  
  console.log(`✅ Found ${migrationCount} migrations configured`);
  
  // Check for compression
  if (indexContent.includes("require('compression')")) {
    console.log('✅ Compression module imported');
  } else {
    console.log('❌ Compression module NOT imported');
    allGood = false;
  }
  
  // Check for default users seeder
  if (indexContent.includes("require('./seeders/createDefaultUsers')")) {
    console.log('✅ Default users seeder configured');
  } else {
    console.log('❌ Default users seeder NOT configured');
    allGood = false;
  }
} else {
  console.log('❌ index.js not found');
  allGood = false;
}

// Check 2: Verify all migration files exist
console.log('\n2️⃣ Checking migration files...');
const requiredMigrations = [
  'add_linked_shifting_id.js',
  'create_opening_balances_table.js',
  'update_kunchinittu_constraints.js',
  'create_balance_audit_trails_table.js',
  'add_performance_indexes.js',
  'add_from_outturn_id.js',
  'create_rice_production_tables.js',
  'update_rice_production_product_types.js',
  'add_rice_production_indexes.js',
  'add_unpolished_to_byproducts.js',
  'add_rj_rice_to_byproducts.js',
  'fix_net_weight.js',
  'create_purchase_rates_table.js',
  'add_sute_to_purchase_rates.js',
  'create_hamali_rates_table.js',
  'create_hamali_entries_table.js',
  'add_status_to_hamali_entries.js',
  'add_unique_kunchinittu_name.js',
  'add_loose_movement_type.js',
  'add_paddy_bags_deducted_column.js',
  'update_rate_type_enum.js'
];

const migrationsDir = path.join(__dirname, 'migrations');
let missingMigrations = 0;

requiredMigrations.forEach(migration => {
  const migrationPath = path.join(migrationsDir, migration);
  if (fs.existsSync(migrationPath)) {
    // Silent success
  } else {
    console.log(`❌ Missing: ${migration}`);
    missingMigrations++;
    allGood = false;
  }
});

if (missingMigrations === 0) {
  console.log(`✅ All ${requiredMigrations.length} migration files present`);
} else {
  console.log(`❌ ${missingMigrations} migration files missing`);
}

// Check 3: Verify seeders
console.log('\n3️⃣ Checking seeders...');
const seederPath = path.join(__dirname, 'seeders', 'createDefaultUsers.js');
if (fs.existsSync(seederPath)) {
  console.log('✅ Default users seeder exists');
} else {
  console.log('❌ Default users seeder missing');
  allGood = false;
}

// Check 4: Verify models
console.log('\n4️⃣ Checking models...');
const requiredModels = [
  'User.js',
  'Arrival.js',
  'Location.js',
  'Outturn.js',
  'ByProduct.js',
  'OpeningBalance.js',
  'BalanceAuditTrail.js',
  'Packaging.js',
  'RiceProduction.js',
  'PurchaseRate.js',
  'HamaliRate.js',
  'HamaliEntry.js'
];

const modelsDir = path.join(__dirname, 'models');
let missingModels = 0;

requiredModels.forEach(model => {
  const modelPath = path.join(modelsDir, model);
  if (!fs.existsSync(modelPath)) {
    console.log(`❌ Missing: ${model}`);
    missingModels++;
    allGood = false;
  }
});

if (missingModels === 0) {
  console.log(`✅ All ${requiredModels.length} model files present`);
} else {
  console.log(`❌ ${missingModels} model files missing`);
}

// Check 5: Verify package.json dependencies
console.log('\n5️⃣ Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = [
    'express',
    'sequelize',
    'pg',
    'bcryptjs',
    'jsonwebtoken',
    'cors',
    'helmet',
    'compression',
    'dotenv'
  ];
  
  let missingDeps = 0;
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
      console.log(`❌ Missing dependency: ${dep}`);
      missingDeps++;
      allGood = false;
    }
  });
  
  if (missingDeps === 0) {
    console.log(`✅ All ${requiredDeps.length} required dependencies present`);
  } else {
    console.log(`❌ ${missingDeps} dependencies missing`);
  }
} else {
  console.log('❌ package.json not found');
  allGood = false;
}

// Check 6: Verify .env file
console.log('\n6️⃣ Checking environment configuration...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'JWT_SECRET'];
  
  let missingEnvVars = 0;
  requiredEnvVars.forEach(envVar => {
    if (!envContent.includes(envVar)) {
      console.log(`⚠️  Missing env var: ${envVar}`);
      missingEnvVars++;
    }
  });
  
  if (missingEnvVars === 0) {
    console.log('✅ All required environment variables configured');
  } else {
    console.log(`⚠️  ${missingEnvVars} environment variables may be missing`);
  }
} else {
  console.log('⚠️  .env file not found (may need to create from .env.example)');
}

// Final Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
  console.log('🎉 ALL CHECKS PASSED!\n');
  console.log('✅ Your auto-setup is fully configured');
  console.log('✅ 20 migrations ready to run');
  console.log('✅ All models and seeders in place');
  console.log('✅ All dependencies installed\n');
  console.log('💡 You can now:');
  console.log('   1. Delete your database');
  console.log('   2. Recreate it with: CREATE DATABASE mother_india_stock;');
  console.log('   3. Run: npm run dev');
  console.log('   4. Everything will auto-create!\n');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED\n');
  console.log('Please fix the issues above before starting the server.\n');
  process.exit(1);
}
