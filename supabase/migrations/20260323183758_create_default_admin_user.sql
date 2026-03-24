/*
  # Create Default Admin User

  1. Purpose
    - Creates the default admin user account for initial access
    - Email: cheickahmedt@gmail.com
    - Password: admin123 (should be changed after first login)
    - Role: admin

  2. Important Notes
    - This creates both the auth user and the profile record
    - The password is hashed by Supabase Auth
    - This is idempotent - safe to run multiple times
*/

-- Create the admin user in auth.users if it doesn't exist
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_id FROM auth.users WHERE email = 'cheickahmedt@gmail.com';
  
  IF admin_id IS NULL THEN
    -- Create the auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'cheickahmedt@gmail.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;

    -- Create the user profile
    INSERT INTO users (id, email, name, role, created_at)
    VALUES (
      admin_id,
      'cheickahmedt@gmail.com',
      'Default Admin',
      'admin',
      NOW()
    );

    RAISE NOTICE 'Default admin user created with ID: %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', admin_id;
  END IF;
END $$;