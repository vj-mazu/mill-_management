-- Mother India Stock Management Database Reset
-- Run this script in PostgreSQL to start fresh

-- Drop all tables
DROP TABLE IF EXISTS arrivals CASCADE;
DROP TABLE IF EXISTS kunchinittus CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS varieties CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enums
DROP TYPE IF EXISTS enum_arrivals_movementtype CASCADE;
DROP TYPE IF EXISTS enum_arrivals_status CASCADE;
DROP TYPE IF EXISTS enum_users_role CASCADE;

-- Now restart the server and it will auto-create everything fresh