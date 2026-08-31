-- Migration: Add is_best_seller column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
