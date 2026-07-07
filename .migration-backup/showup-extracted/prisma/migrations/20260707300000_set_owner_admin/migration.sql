-- Grant admin role to owner account if not already admin
UPDATE "user"
SET role = 'admin'
WHERE email = 'snillefredrik@gmail.com'
  AND (role IS NULL OR role <> 'admin');
