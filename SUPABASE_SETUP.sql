-- Fincoach Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor
-- Dashboard: https://yrgeujkmnqsedikezgso.supabase.co

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT UNIQUE,
    password TEXT NOT NULL,
    passkey TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);

-- ============================================
-- 2. USER SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);

-- ============================================
-- 3. OTP CODES TABLE (SMS)
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
    id BIGSERIAL PRIMARY KEY,
    identifier TEXT NOT NULL,
    otp TEXT NOT NULL,
    otp_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_otp_token ON otp_codes(otp_token);

-- ============================================
-- 4. EMAIL OTP CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_otp_codes (
    id BIGSERIAL PRIMARY KEY,
    identifier TEXT NOT NULL,
    otp TEXT NOT NULL,
    otp_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_identifier ON email_otp_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_email_otp_token ON email_otp_codes(otp_token);

-- ============================================
-- 5. PASSKEY VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS passkey_verifications (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    passkey_token TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_passkey_email ON passkey_verifications(email);
CREATE INDEX IF NOT EXISTS idx_passkey_token ON passkey_verifications(passkey_token);

-- ============================================
-- 6. FINANCIAL PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS financial_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employment_status TEXT NOT NULL,
    monthly_income DECIMAL(12, 2) NOT NULL,
    additional_income TEXT,
    additional_income_amount DECIMAL(12, 2) DEFAULT 0,
    housing_cost DECIMAL(12, 2) NOT NULL,
    utilities DECIMAL(12, 2) NOT NULL,
    transportation DECIMAL(12, 2) NOT NULL,
    groceries DECIMAL(12, 2) NOT NULL,
    other_expenses DECIMAL(12, 2) DEFAULT 0,
    total_debt DECIMAL(12, 2) DEFAULT 0,
    monthly_debt_payment DECIMAL(12, 2) DEFAULT 0,
    current_savings DECIMAL(12, 2) DEFAULT 0,
    emergency_fund DECIMAL(12, 2) DEFAULT 0,
    goals JSONB,
    savings_goal DECIMAL(12, 2) DEFAULT 0,
    time_horizon TEXT,
    risk_tolerance TEXT,
    total_income DECIMAL(12, 2),
    total_expenses DECIMAL(12, 2),
    net_income DECIMAL(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_user_id ON financial_profiles(user_id);

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Financial profiles policies
CREATE POLICY "Users can view own financial profile" ON financial_profiles
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own financial profile" ON financial_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own financial profile" ON financial_profiles
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Public access for authentication tables (managed by backend)
CREATE POLICY "Public read access for OTP" ON otp_codes
    FOR SELECT USING (true);

CREATE POLICY "Public insert access for OTP" ON otp_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for OTP" ON otp_codes
    FOR UPDATE USING (true);

CREATE POLICY "Public read access for Email OTP" ON email_otp_codes
    FOR SELECT USING (true);

CREATE POLICY "Public insert access for Email OTP" ON email_otp_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for Email OTP" ON email_otp_codes
    FOR UPDATE USING (true);

-- ============================================
-- 8. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for financial_profiles
CREATE TRIGGER update_financial_profiles_updated_at
    BEFORE UPDATE ON financial_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM email_otp_codes WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM passkey_verifications WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. INITIAL DATA (OPTIONAL)
-- ============================================

-- You can add test data here if needed
-- Example:
-- INSERT INTO users (name, email, mobile, password) 
-- VALUES ('Test User', 'test@example.com', '+1234567890', 'hashed_password');

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check row counts
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL
SELECT 'otp_codes', COUNT(*) FROM otp_codes
UNION ALL
SELECT 'email_otp_codes', COUNT(*) FROM email_otp_codes
UNION ALL
SELECT 'passkey_verifications', COUNT(*) FROM passkey_verifications
UNION ALL
SELECT 'financial_profiles', COUNT(*) FROM financial_profiles;
