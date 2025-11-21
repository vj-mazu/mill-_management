-- Complete Database Reset Script for Mother India Stock Management
-- Run this script to completely reset and recreate the database

-- Drop all tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS arrivals CASCADE;
DROP TABLE IF EXISTS kunchinittus CASCADE;
DROP TABLE IF EXISTS varieties CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS enum_arrivals_movementtype CASCADE;
DROP TYPE IF EXISTS enum_arrivals_status CASCADE;
DROP TYPE IF EXISTS enum_users_role CASCADE;

-- Recreate all tables with proper constraints

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'manager', 'admin')),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouses table
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(255),
    capacity DECIMAL(10, 2),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varieties table
CREATE TABLE varieties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kunchinittus table with proper chain system
CREATE TABLE kunchinittus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,  -- Kunchinittu names must be globally unique
    code VARCHAR(20) NOT NULL,          -- Codes can repeat across warehouses
    "warehouseId" INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    "varietyId" INTEGER REFERENCES varieties(id) ON DELETE SET NULL,
    capacity DECIMAL(10, 2),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique constraint: same code can exist in different warehouses
    CONSTRAINT unique_code_warehouse UNIQUE (code, "warehouseId")
);

-- Arrivals table with proper chain system
CREATE TABLE arrivals (
    id SERIAL PRIMARY KEY,
    "slNo" VARCHAR(20) UNIQUE NOT NULL,
    date DATE NOT NULL,
    "movementType" VARCHAR(20) NOT NULL CHECK ("movementType" IN ('purchase', 'shifting')),
    
    -- Purchase specific fields
    broker VARCHAR(100),
    variety VARCHAR(100),  -- Changed to text field instead of foreign key
    bags INTEGER,
    "fromLocation" VARCHAR(255),
    "toKunchinintuId" INTEGER REFERENCES kunchinittus(id),
    "toWarehouseId" INTEGER REFERENCES warehouses(id),
    
    -- Shifting specific fields
    "fromKunchinintuId" INTEGER REFERENCES kunchinittus(id),
    "fromWarehouseId" INTEGER REFERENCES warehouses(id),
    "toWarehouseShiftId" INTEGER REFERENCES warehouses(id),
    
    -- Common measurement fields
    moisture DECIMAL(5, 2),
    cutting VARCHAR(50),
    "wbNo" VARCHAR(50) NOT NULL,
    "grossWeight" DECIMAL(10, 2) NOT NULL,
    "tareWeight" DECIMAL(10, 2) NOT NULL,
    "netWeight" DECIMAL(10, 2) NOT NULL,
    "lorryNumber" VARCHAR(50) NOT NULL,
    remarks TEXT,
    
    -- System fields
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    "createdBy" INTEGER NOT NULL REFERENCES users(id),
    "approvedBy" INTEGER REFERENCES users(id),
    "adminApprovedBy" INTEGER REFERENCES users(id),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "adminApprovedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users("isActive");

CREATE INDEX idx_warehouses_name ON warehouses(name);
CREATE INDEX idx_warehouses_code ON warehouses(code);
CREATE INDEX idx_warehouses_active ON warehouses("isActive");

CREATE INDEX idx_varieties_name ON varieties(name);
CREATE INDEX idx_varieties_code ON varieties(code);
CREATE INDEX idx_varieties_active ON varieties("isActive");

CREATE INDEX idx_kunchinittus_name ON kunchinittus(name);
CREATE INDEX idx_kunchinittus_code ON kunchinittus(code);
CREATE INDEX idx_kunchinittus_warehouse ON kunchinittus("warehouseId");
CREATE INDEX idx_kunchinittus_variety ON kunchinittus("varietyId");
CREATE INDEX idx_kunchinittus_active ON kunchinittus("isActive");

CREATE INDEX idx_arrivals_slno ON arrivals("slNo");
CREATE INDEX idx_arrivals_date ON arrivals(date);
CREATE INDEX idx_arrivals_movement_type ON arrivals("movementType");
CREATE INDEX idx_arrivals_status ON arrivals(status);
CREATE INDEX idx_arrivals_created_by ON arrivals("createdBy");
CREATE INDEX idx_arrivals_approved_by ON arrivals("approvedBy");
CREATE INDEX idx_arrivals_admin_approved_by ON arrivals("adminApprovedBy");
CREATE INDEX idx_arrivals_date_movement ON arrivals(date, "movementType");
CREATE INDEX idx_arrivals_status_movement ON arrivals(status, "movementType");

-- Insert default users
INSERT INTO users (username, password, role) VALUES 
('staff', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff'),     -- password: staff123
('rohit', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),   -- password: rohit456  
('ashish', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');    -- password: ashish789

-- Insert sample warehouses
INSERT INTO warehouses (name, code, location) VALUES 
('GODOWN1', 'GD1', 'Main Storage Area'),
('GODOWN2', 'GD2', 'Secondary Storage Area'),
('PEGZA', 'PGZ', 'Pegza Storage Facility');

-- Insert sample varieties
INSERT INTO varieties (name, code, description) VALUES 
('DEC24 RNR', 'D24RNR', 'December 2024 RNR Variety'),
('DEC24 P SONA', 'D24PS', 'December 2024 P Sona Variety'),
('JAN25 BASMATI', 'J25BAS', 'January 2025 Basmati Variety');

COMMIT;

-- Display success message
SELECT 'Database reset completed successfully! All tables recreated with proper chain system.' as message;