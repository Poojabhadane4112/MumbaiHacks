# Fincoach - Autonomous Financial Coach

A complete financial coaching platform with user authentication, OTP verification, and cloud database integration.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase Database

1. Go to: https://supabase.com/dashboard/project/yrgeujkmnqsedikezgso
2. Click "SQL Editor" → "New Query"
3. Copy and paste the entire `SUPABASE_SETUP.sql` file
4. Click "Run" to create all tables

### 3. Start Server
```bash
npm start
```

### 4. Open Browser
Navigate to `http://localhost:3000`

## ✨ Features

- 🔐 User authentication (Signup/Login)
- 📱 Password reset with 3 methods:
  - SMS OTP (Twilio)
  - Email OTP (Nodemailer)
  - Security Passkey
- 💰 Financial profile onboarding (4 steps)
- 📊 Income, expenses, debts, and savings tracking
- 🎯 Goal setting and planning
- 🤖 AI-ready data structure
- ☁️ Cloud database (Supabase/PostgreSQL)
- 🔒 Secure authentication (JWT + bcrypt)
- 🎨 Modern, responsive UI
- 🎥 Demo video modal

## 🏗️ Tech Stack

**Frontend:**
- HTML5, CSS3, JavaScript
- Supabase Client (real-time)
- Responsive design

**Backend:**
- Node.js + Express.js
- Supabase (PostgreSQL)
- JWT authentication
- bcryptjs password hashing
- Twilio (SMS)
- Nodemailer (Email)

## 📁 Project Structure

```
fincoach/
├── index.html              # Landing page
├── auth.html               # Login/Signup
├── forgot-password.html    # Password reset (3 methods)
├── onboarding.html         # Financial profile setup
├── server.js               # Express backend
├── database/
│   ├── supabase.js        # Supabase connection
│   ├── db-adapter.js      # Database adapter
│   └── db.js              # SQLite fallback
├── routes/
│   ├── auth.js            # Authentication
│   ├── password-reset.js  # OTP & password reset
│   └── financial-profile.js
├── services/
│   ├── otp-service.js     # OTP generation & verification
│   └── notification-service.js  # SMS & Email delivery
├── middleware/
│   └── auth.js            # JWT middleware
└── public/
    └── config.js          # Frontend Supabase config
```

## 🔧 Configuration

Your `.env` file is already configured with:

```env
# Supabase (Cloud Database)
SUPABASE_URL=https://yrgeujkmnqsedikezgso.supabase.co
SUPABASE_ANON_KEY=your_anon_key
USE_SUPABASE=true

# Server
PORT=3000
JWT_SECRET=your_jwt_secret
NODE_ENV=development

# SMS (Optional - for real SMS)
ENABLE_SMS=false
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Optional - for real email)
ENABLE_EMAIL=false
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
```

## 🧪 Testing

### Create Test Account
1. Open http://localhost:3000
2. Click "Get Started"
3. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Mobile: +1234567890
   - Password: Test1234
4. Complete onboarding

### Test Password Reset
1. Click "Forgot password?"
2. Choose "SMS Verification"
3. Enter: +1234567890
4. **Check server console** for OTP code
5. Enter OTP and reset password

### Verify in Supabase
1. Go to: https://supabase.com/dashboard/project/yrgeujkmnqsedikezgso
2. Click "Table Editor"
3. Check "users" table - your user should be there!
4. Check "otp_codes" table - OTP records

## 📊 Database Tables

- **users** - User accounts
- **user_sessions** - Login sessions
- **otp_codes** - SMS OTP records
- **email_otp_codes** - Email OTP records
- **passkey_verifications** - Passkey verifications
- **financial_profiles** - User financial data

## 🔐 Security Features

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Row Level Security (RLS)
- ✅ OTP expiry (10 minutes)
- ✅ Max 5 verification attempts
- ✅ Session validation (15 minutes)
- ✅ Input validation
- ✅ SQL injection prevention

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/signin` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Password Reset
- `POST /api/auth/forgot-password` - Send SMS OTP
- `POST /api/auth/forgot-password-email` - Send Email OTP
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/verify-passkey` - Verify passkey
- `POST /api/auth/reset-password` - Reset password

### Financial Profile
- `POST /api/financial-profile` - Create/update profile
- `GET /api/financial-profile` - Get user profile
- `GET /api/financial-profile/ai-summary` - Get AI-ready summary

## 🚀 Deployment

### Backend
Deploy to: Heroku, Railway, Render, or Vercel

### Frontend
Deploy to: Vercel, Netlify, or GitHub Pages

### Database
Already on Supabase (cloud-hosted)

## 📱 Enable Real SMS/Email

### For Real SMS (Twilio):
1. Sign up: https://www.twilio.com/try-twilio
2. Update `.env`: `ENABLE_SMS=true`
3. Add your Twilio credentials
4. Restart server

### For Real Email (Gmail):
1. Get Gmail App Password
2. Update `.env`: `ENABLE_EMAIL=true`
3. Add your email credentials
4. Restart server

## 🐛 Troubleshooting

**OTP not showing?**
- Check server console (PowerShell window)
- OTPs are logged in development mode

**"Cannot find module"?**
- Run: `npm install`

**"Using SQLite" instead of Supabase?**
- Check `.env`: `USE_SUPABASE=true`
- Restart server

**Tables not found?**
- Run `SUPABASE_SETUP.sql` in Supabase dashboard

## 📚 Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/yrgeujkmnqsedikezgso
- **Supabase Docs**: https://supabase.com/docs
- **Twilio Docs**: https://www.twilio.com/docs

## 📄 License

ISC

---

**Built with ❤️ for financial empowerment**
