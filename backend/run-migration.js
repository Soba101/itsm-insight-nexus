#!/usr/bin/env node

import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 15432,
  database: 'itsm_db',
  user: 'postgres',
  password: 'postgres',
});

async function runMigration() {
  try {
    console.log('🔄 Running auth migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../docker/migrations/001_create_users_table.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
    
    // Create test user with hashed password
    const testPassword = 'admin123';
    const passwordHash = await bcrypt.hash(testPassword, 10);
    
    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role) 
      VALUES ('admin@itsm.local', $1, 'Admin User', 'admin')
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = $1
    `, [passwordHash]);
    
    console.log('✅ Test user created/updated:');
    console.log('   Email: admin@itsm.local');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
