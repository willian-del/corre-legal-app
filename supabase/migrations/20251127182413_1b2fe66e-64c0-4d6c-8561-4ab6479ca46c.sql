-- Remove foreign key constraint that prevents audit logging after user deletion
-- The target_user_id is nullable and user details are stored in the details JSON field
ALTER TABLE admin_audit_logs 
DROP CONSTRAINT IF EXISTS admin_audit_logs_target_user_id_fkey;