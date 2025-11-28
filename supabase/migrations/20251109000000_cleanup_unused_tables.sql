-- Migration: Cleanup unused/deprecated tables
-- Created: 2025-11-09
-- Description: Removes legacy English-named tables and unused password reset tracking table
--
-- Tables being removed:
-- 1. orders, order_lines, change_history - Legacy tables created in May 2025 but never used
--    These were replaced by Spanish equivalents (tbl_pedidos_rep, tbl_ln_pedidos_rep, tbl_historico_cambios)
-- 2. password_reset_attempts - Feature table that was created but never integrated into the application
--
-- SAFETY: All tables being dropped have zero references in the source code (verified via codebase scan)

-- Drop legacy English-named tables (created in 20250517181958_dawn_sunset.sql)
-- These were deprecated immediately and never used in production
DROP TABLE IF EXISTS change_history CASCADE;
DROP TABLE IF EXISTS order_lines CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Drop unused password reset tracking table (created in 20250521185402_cold_dust.sql)
-- This table was created for a feature that was never implemented
DROP TABLE IF EXISTS app_auth.password_reset_attempts CASCADE;

-- Optional: Log cleanup in a comment
COMMENT ON SCHEMA public IS 'Schema cleanup completed 2025-11-09: Removed 4 unused tables (orders, order_lines, change_history, password_reset_attempts)';
