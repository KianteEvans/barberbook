-- Add the 'barber' user role (staff login scoped to their own chair). The
-- role CHECK is inline/auto-named users_role_check. ASCII only.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'client', 'barber'));
