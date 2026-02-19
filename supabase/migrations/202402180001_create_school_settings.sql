-- Create school_settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read settings
CREATE POLICY "Authenticated users can read settings" ON school_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for admins to manage settings
CREATE POLICY "Admins can manage settings" ON school_settings
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Insert default currency setting
INSERT INTO school_settings (setting_key, setting_value, description)
VALUES ('currency_code', 'ZMW', 'School currency code (e.g., ZMW, USD, EUR)')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_school_settings_updated_at
  BEFORE UPDATE ON school_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
