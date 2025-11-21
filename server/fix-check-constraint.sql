-- Fix the CHECK CONSTRAINT for rice_productions table
-- This will allow "Sizer Broken" to be inserted

-- Step 1: Drop the existing check constraint
ALTER TABLE rice_productions DROP CONSTRAINT IF EXISTS rice_productions_producttype_check;

-- Step 2: Add the new check constraint with "Sizer Broken" included
ALTER TABLE rice_productions
ADD CONSTRAINT rice_productions_producttype_check
CHECK ("productType" IN (
    'Rice', 
    'Bran', 
    'Farm Bran', 
    'Rejection Rice', 
    'Sizer Broken', 
    'Rejection Broken', 
    'Broken', 
    'Zero Broken', 
    'Faram', 
    'Unpolished', 
    'RJ Rice 1', 
    'RJ Rice 2'
));

-- Verify the constraint was created
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'rice_productions_producttype_check';
