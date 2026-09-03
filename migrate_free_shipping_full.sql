-- Migration: Add free shipping FULL flag to products table
-- Run: psql "$DATABASE_URL" -f migrate_free_shipping_full.sql

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_free_shipping_full BOOLEAN DEFAULT FALSE;
