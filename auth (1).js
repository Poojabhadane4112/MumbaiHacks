const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../database/db');

// Validation middleware
const signupValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('mobile').notEmpty().withMessage('Mobile number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const signinValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', signupValidation, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, mobile, password, passkey } = req.body;

        // Check if user already exists
        const existingUser = await dbGet('SELECT * FROM users WHERE email = ? OR mobile = ?', [email, mobile]);
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? 
                    'User with this email already exists' : 
                    'User with this mobile number already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Hash passkey if provided
        let hashedPasskey = null;
        if (passkey && passkey.length >= 8) {
            hashedPasskey = await bcrypt.hash(passkey, salt);
        }

        // Insert new user
        const result = await dbRun(
            'INSERT INTO users (name, email, mobile, password, passkey) VALUES (?, ?, ?, ?, ?)',
            [name, email, mobile, hashedPassword, hashedPasskey]
        );

        // Generate token
        const token = generateToken(result.id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: result.id,
                name,
                email,
                token
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});

// @route   POST /api/auth/signin
// @desc    Login user
// @access  Public
router.post('/signin', signinValidation, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, rememberMe } = req.body;

        // Find user by email
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        // Log session
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');
        await dbRun(
            'INSERT INTO user_sessions (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
            [user.id, ipAddress, userAgent]
        );

        // Generate token (longer expiry if remember me is checked)
        const tokenExpiry = rememberMe ? '30d' : process.env.JWT_EXPIRE;
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: tokenExpiry });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                userId: user.id,
                name: user.name,
                email: user.email,
                token
            }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
});

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await dbGet('SELECT id, name, email, created_at FROM users WHERE id = ?', [decoded.id]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: error.message
        });
    }
});

module.exports = router;
