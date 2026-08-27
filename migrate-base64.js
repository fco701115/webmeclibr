const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

// Load .env file if present
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'webmeclibr',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
      }
);

function uploadToCloudinary(base64Str, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(base64Str, { folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
  });
}

async function migrateTable(tableName, imageColumn) {
  const result = await pool.query(`SELECT id, ${imageColumn} FROM ${tableName} WHERE ${imageColumn} IS NOT NULL`);
  let migrated = 0;
  for (const row of result.rows) {
    const val = row[imageColumn];
    if (typeof val === 'string' && val.startsWith('data:image')) {
      try {
        const url = await uploadToCloudinary(val, 'webmeclibr');
        await pool.query(`UPDATE ${tableName} SET ${imageColumn} = $1 WHERE id = $2`, [url, row.id]);
        migrated++;
        console.log(`  ${tableName}#${row.id}: base64 → ${url}`);
      } catch (e) {
        console.error(`  ${tableName}#${row.id}: ERROR - ${e.message}`);
      }
    }
  }
  return migrated;
}

async function migrateArrayTable(tableName, imageColumn) {
  const result = await pool.query(`SELECT id, ${imageColumn} FROM ${tableName} WHERE ${imageColumn} IS NOT NULL`);
  let migrated = 0;
  for (const row of result.rows) {
    let images = row[imageColumn];
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch (e) { continue; }
    }
    if (!Array.isArray(images)) continue;
    let changed = false;
    for (let i = 0; i < images.length; i++) {
      if (typeof images[i] === 'string' && images[i].startsWith('data:image')) {
        try {
          images[i] = await uploadToCloudinary(images[i], 'webmeclibr');
          changed = true;
        } catch (e) {
          console.error(`  ${tableName}#${row.id}[${i}]: ERROR - ${e.message}`);
        }
      }
    }
    if (changed) {
      await pool.query(`UPDATE ${tableName} SET ${imageColumn} = $1 WHERE id = $2`, [JSON.stringify(images), row.id]);
      migrated++;
      console.log(`  ${tableName}#${row.id}: array base64 → urls`);
    }
  }
  return migrated;
}

async function main() {
  console.log('Migrating base64 images to Cloudinary...\n');
  let total = 0;
  total += await migrateTable('slides', 'image');
  total += await migrateTable('split_banners', 'image');
  total += await migrateTable('categories', 'image');
  total += await migrateArrayTable('products', 'images');
  console.log(`\nDone. ${total} records migrated.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
