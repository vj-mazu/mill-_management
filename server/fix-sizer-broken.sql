-- SQL Script to add "Sizer Broken" to rice_productions ENUM
-- Run this directly in your PostgreSQL database

-- Step 1: Find the ENUM type name
-- Run this first to see the ENUM type name:
-- SELECT t.typname FROM pg_type t WHERE t.typname LIKE '%rice_productions%productType%';

-- Step 2: Add "Sizer Broken" to the ENUM (replace the enum name if different)
DO $$
BEGIN
    -- Try to add the value if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Sizer Broken' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname LIKE '%rice_productions%productType%' LIMIT 1)
    ) THEN
        -- Get the actual enum type name
        DECLARE
            enum_name text;
        BEGIN
            SELECT t.typname INTO enum_name
            FROM pg_type t 
            WHERE t.typname LIKE '%rice_productions%productType%' 
            LIMIT 1;
            
            -- Add the value
            EXECUTE format('ALTER TYPE %I ADD VALUE %L', enum_name, 'Sizer Broken');
            RAISE NOTICE 'Added "Sizer Broken" to ENUM %', enum_name;
        END;
    ELSE
        RAISE NOTICE '"Sizer Broken" already exists in ENUM';
    END IF;
END $$;

-- Step 3: Drop and recreate check constraint (if it exists)
ALTER TABLE rice_productions DROP CONSTRAINT IF EXISTS rice_productions_productType_check;

ALTER TABLE rice_productions
ADD CONSTRAINT rice_productions_productType_check
CHECK ("productType" IN (
    'Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken', 
    'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 
    'Unpolished', 'RJ Rice 1', 'RJ Rice 2'
));

-- Verify the change
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname LIKE '%rice_productions%productType%' LIMIT 1
)
ORDER BY enumsortorder;
