const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { dbRun, dbGet } = require('../database/db');
const otpService = require('../services/otp-service');
const notificationService = require('../services/notification-service');

// Helper function to generate token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Validation middleware
const mobileValidation = [
    body('mobile').notEmpty().withMessage('Mobile number is required')
];

// @route   POST /api/auth/forgot-password
// @desc    Send OTP to mobile number
// @access  Public
router.post('/forgot-password', mobileValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { mobile } = req.body;

        // Check if user exists with this mobile number
        const user = await dbGet('SELECT * FROM users WHERE mobile = ?', [mobile]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this mobile number'
            });
        }

        // Generate and store OTP using OTP service
        const otpData = await otpService.createOTP('sms', mobile);

        // Send SMS using notification service
        await notificationService.sendOTPSMS(mobile, otpData.otp);

        res.json({
            success: true,
            message: 'Verification code sent successfully to your mobile number',
            data: {
                otpToken: otpData.token,
                expiresIn: otpData.expiresIn
            }
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending verification code',
            error: error.message
        });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP code (SMS or Email)
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { mobile, email, otp, otpToken } = req.body;

        if (!otp || !otpToken) {
            return res.status(400).json({
                success: false,
                message: 'Verification code and token are required'
            });
        }

        let type, identifier;

        // Determine OTP type and identifier
        if (mobile) {
            type = 'sms';
            identifier = mobile;
        } else if (email) {
            type = 'email';
            identifier = email;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Either mobile or email is required'
            });
        }

        // Verify OTP using OTP service
        const result = await otpService.verifyOTP(type, identifier, otp, otpToken);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                code: result.code,
                remainingAttempts: result.remainingAttempts
            });
        }

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying code',
            error: error.message
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password after OTP or passkey verification
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { mobile, email, newPassword, otpToken, passkeyToken } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        let user;

        // Handle SMS OTP-based reset
        if (mobile && otpToken) {
            // Check if verification is valid using OTP service
            const isValid = await otpService.isVerificationValid('sms', mobile, otpToken, 15);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired session. Please verify your code again.'
                });
            }

            // Get user by mobile
            user = await dbGet('SELECT * FROM users WHERE mobile = ?', [mobile]);

            // Invalidate all OTPs for this mobile
            await otpService.invalidateOTPs('sms', mobile);
        }
        // Handle Email OTP-based reset
        else if (email && otpToken && !passkeyToken) {
            // Check if verification is valid using OTP service
            const isValid = await otpService.isVerificationValid('email', email, otpToken, 15);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired session. Please verify your code again.'
                });
            }

            // Get user by email
            user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

            // Invalidate all email OTPs
            await otpService.invalidateOTPs('email', email);
        }
        // Handle passkey-based reset
        else if (email && passkeyToken) {
            // Verify passkey token
            const passkeyRecord = await dbGet(
                `SELECT * FROM passkey_verifications 
                 WHERE email = ? AND passkey_token = ? AND is_used = 0 
                 ORDER BY created_at DESC LIMIT 1`,
                [email, passkeyToken]
            );

            if (!passkeyRecord) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request. Please verify passkey first.'
                });
            }

            // Check if passkey verification is still valid
            const now = new Date();
            const expiresAt = new Date(passkeyRecord.expires_at);

            if (now > expiresAt) {
                return res.status(400).json({
                    success: false,
                    message: 'Session expired. Please start the password reset process again.'
                });
            }

            // Get user by email
            user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

            // Mark passkey verification as used
            await dbRun(
                'UPDATE passkey_verifications SET is_used = 1 WHERE id = ?',
                [passkeyRecord.id]
            );
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset method. Please provide either mobile+otpToken or email+passkeyToken.'
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await dbRun(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
});

// @route   POST /api/auth/verify-passkey
// @desc    Verify user's security passkey
// @access  Public
router.post('/verify-passkey', async (req, res) => {
    try {
        const { email, passkey } = req.body;

        if (!email || !passkey) {
            return res.status(400).json({
                success: false,
                message: 'Email and passkey are required'
            });
        }

        // Get user by email
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }

        // Check if user has a passkey set
        if (!user.passkey) {
            return res.status(400).json({
                success: false,
                message: 'No passkey configured for this account. Please use SMS verification.'
            });
        }

        // Verify passkey (compare hashed passkey)
        const isPasskeyValid = await bcrypt.compare(passkey, user.passkey);

        if (!isPasskeyValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid passkey. Please try again.'
            });
        }

        // Generate verification token
        const passkeyToken = generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store verification record
        await dbRun(
            'INSERT INTO passkey_verifications (email, passkey_token, expires_at) VALUES (?, ?, ?)',
            [email, passkeyToken, expiresAt.toISOString()]
        );

        res.json({
            success: true,
            message: 'Passkey verified successfully',
            data: {
                passkeyToken,
                expiresIn: 900 // seconds
            }
        });

    } catch (error) {
        console.error('Verify passkey error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying passkey',
            error: error.message
        });
    }
});

// @route   POST /api/auth/set-passkey
// @desc    Set or update user's security passkey
// @access  Private (requires authentication)
router.post('/set-passkey', async (req, res) => {
    try {
        const { email, passkey } = req.body;

        if (!email || !passkey) {
            return res.status(400).json({
                success: false,
                message: 'Email and passkey are required'
            });
        }

        if (passkey.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Passkey must be at least 8 characters'
            });
        }

        // Get user
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash passkey
        const salt = await bcrypt.genSalt(10);
        const hashedPasskey = await bcrypt.hash(passkey, salt);

        // Update user's passkey
        await dbRun(
            'UPDATE users SET passkey = ? WHERE id = ?',
            [hashedPasskey, user.id]
        );

        res.json({
            success: true,
            message: 'Security passkey set successfully'
        });

    } catch (error) {
        console.error('Set passkey error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting passkey',
            error: error.message
        });
    }
});


// @route   POST /api/auth/forgot-password-email
// @desc    Send OTP to email address
// @access  Public
router.post('/forgot-password-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Check if user exists with this email
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address'
            });
        }

        // Generate and store OTP using OTP service
        const otpData = await otpService.createOTP('email', email);

        // Send Email using notification service
        await notificationService.sendOTPEmail(email, otpData.otp);

        res.json({
            success: true,
            message: 'Verification code sent successfully to your email',
            data: {
                otpToken: otpData.token,
                expiresIn: otpData.expiresIn
            }
        });

    } catch (error) {
        console.error('Forgot password email error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending verification code',
            error: error.message
        });
    }
});


module.exports = router;
