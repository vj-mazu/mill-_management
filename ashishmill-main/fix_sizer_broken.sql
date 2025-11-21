-- Fix for Sizer Broken ENUM error
-- Run this in your PostgreSQL database

-- Connect to the database (if not already connected)
-- \c mother_india

-- Step 1: Add 'Sizer Broken' to the ENUM type
-- This will add the value if it doesn't exist
DO $$
BEGIN
    -- Try to add the value to the ENUM
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Sizer Broken' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_rice_productions_productType'
        )
    ) THEN
        ALTER TYPE enum_rice_productions_productType ADD VALUE 'Sizer Broken';
        RAISE NOTICE 'Added "Sizer Broken" to ENUM';
    ELSE
        RAISE NOTICE '"Sizer Broken" already exists in ENUM';
    END IF;
END $$;

-- Step 2: Verify the ENUM values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'enum_rice_productions_productType'
)
ORDER BY enumsortorder;

-- You should see all these values:
-- Rice
-- Bran
-- Farm Bran
-- Rejection Rice
-- Sizer Broken  <-- This should be here now
-- Rejection Broken
-- Broken
-- Zero Broken
-- Faram
-- Unpolished
-- RJ Rice 1
-- RJ Rice 2
