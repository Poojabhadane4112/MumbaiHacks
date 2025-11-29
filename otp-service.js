const crypto = require('crypto');
const { dbRun, dbGet } = require('../database/db');

/**
 * OTP Service - Centralized OTP generation and verification
 * Supports SMS, Email, and custom OTP types
 */

class OTPService {
    constructor() {
        this.OTP_LENGTH = 6;
        this.OTP_EXPIRY_MINUTES = 10;
        this.MAX_ATTEMPTS = 5;
    }

    /**
     * Generate a random OTP
     * @param {number} length - Length of OTP (default: 6)
     * @returns {string} - Generated OTP
     */
    generateOTP(length = this.OTP_LENGTH) {
        const digits = '0123456789';
        let otp = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }
        
        return otp;
    }

    /**
     * Generate a unique token for OTP verification
     * @returns {string} - Unique token
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Calculate OTP expiry time
     * @param {number} minutes - Minutes until expiry
     * @returns {Date} - Expiry date
     */
    getExpiryTime(minutes = this.OTP_EXPIRY_MINUTES) {
        return new Date(Date.now() + minutes * 60 * 1000);
    }

    /**
     * Store OTP in database
     * @param {string} type - OTP type ('sms', 'email', 'custom')
     * @param {string} identifier - User identifier (mobile, email, etc.)
     * @param {string} otp - Generated OTP
     * @param {string} token - Verification token
     * @returns {Object} - Result with token and expiry info
     */
    async storeOTP(type, identifier, otp, token) {
        const expiresAt = this.getExpiryTime();
        const table = this.getTableName(type);

        try {
            await dbRun(
                `INSERT INTO ${table} (identifier, otp, otp_token, expires_at, attempts) VALUES (?, ?, ?, ?, 0)`,
                [identifier, otp, token, expiresAt.toISOString()]
            );

            return {
                success: true,
                token,
                expiresAt,
                expiresIn: this.OTP_EXPIRY_MINUTES * 60 // seconds
            };
        } catch (error) {
            console.error('Error storing OTP:', error);
            throw new Error('Failed to store OTP');
        }
    }

    /**
     * Verify OTP
     * @param {string} type - OTP type ('sms', 'email', 'custom')
     * @param {string} identifier - User identifier
     * @param {string} otp - OTP to verify
     * @param {string} token - Verification token
     * @returns {Object} - Verification result
     */
    async verifyOTP(type, identifier, otp, token) {
        const table = this.getTableName(type);

        try {
            // Get OTP record
            const otpRecord = await dbGet(
                `SELECT * FROM ${table} 
                 WHERE identifier = ? AND otp_token = ? AND is_used = 0 
                 ORDER BY created_at DESC LIMIT 1`,
                [identifier, token]
            );

            if (!otpRecord) {
                return {
                    success: false,
                    message: 'Invalid or expired verification code',
                    code: 'INVALID_OTP'
                };
            }

            // Check if OTP is expired
            const now = new Date();
            const expiresAt = new Date(otpRecord.expires_at);

            if (now > expiresAt) {
                return {
                    success: false,
                    message: 'Verification code has expired. Please request a new one.',
                    code: 'EXPIRED_OTP'
                };
            }

            // Check max attempts
            if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
                return {
                    success: false,
                    message: 'Maximum verification attempts exceeded. Please request a new code.',
                    code: 'MAX_ATTEMPTS_EXCEEDED'
                };
            }

            // Verify OTP
            if (otpRecord.otp !== otp) {
                // Increment attempts
                await dbRun(
                    `UPDATE ${table} SET attempts = attempts + 1 WHERE id = ?`,
                    [otpRecord.id]
                );

                const remainingAttempts = this.MAX_ATTEMPTS - (otpRecord.attempts + 1);
                return {
                    success: false,
                    message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
                    code: 'WRONG_OTP',
                    remainingAttempts
                };
            }

            // Mark OTP as used
            await dbRun(
                `UPDATE ${table} SET is_used = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [otpRecord.id]
            );

            return {
                success: true,
                message: 'Verification code verified successfully',
                code: 'VERIFIED'
            };

        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw new Error('Failed to verify OTP');
        }
    }

    /**
     * Check if OTP verification is valid (for password reset, etc.)
     * @param {string} type - OTP type
     * @param {string} identifier - User identifier
     * @param {string} token - Verification token
     * @param {number} maxMinutes - Maximum minutes since verification
     * @returns {boolean} - Whether verification is valid
     */
    async isVerificationValid(type, identifier, token, maxMinutes = 15) {
        const table = this.getTableName(type);

        try {
            const otpRecord = await dbGet(
                `SELECT * FROM ${table} 
                 WHERE identifier = ? AND otp_token = ? AND is_used = 1 
                 ORDER BY verified_at DESC LIMIT 1`,
                [identifier, token]
            );

            if (!otpRecord || !otpRecord.verified_at) {
                return false;
            }

            // Check if verification is recent
            const now = new Date();
            const verifiedAt = new Date(otpRecord.verified_at);
            const timeDiff = (now - verifiedAt) / 1000 / 60; // minutes

            return timeDiff <= maxMinutes;

        } catch (error) {
            console.error('Error checking verification:', error);
            return false;
        }
    }

    /**
     * Invalidate all OTPs for an identifier
     * @param {string} type - OTP type
     * @param {string} identifier - User identifier
     */
    async invalidateOTPs(type, identifier) {
        const table = this.getTableName(type);

        try {
            await dbRun(
                `UPDATE ${table} SET is_used = 1 WHERE identifier = ?`,
                [identifier]
            );
        } catch (error) {
            console.error('Error invalidating OTPs:', error);
        }
    }

    /**
     * Clean up expired OTPs (run periodically)
     * @param {string} type - OTP type (optional, cleans all if not specified)
     */
    async cleanupExpiredOTPs(type = null) {
        const tables = type ? [this.getTableName(type)] : ['otp_codes', 'email_otp_codes', 'custom_otp_codes'];

        try {
            for (const table of tables) {
                await dbRun(
                    `DELETE FROM ${table} WHERE expires_at < datetime('now', '-1 day')`,
                    []
                );
            }
            console.log('✅ Expired OTPs cleaned up');
        } catch (error) {
            console.error('Error cleaning up OTPs:', error);
        }
    }

    /**
     * Get statistics for OTP usage
     * @param {string} type - OTP type
     * @returns {Object} - Statistics
     */
    async getStatistics(type) {
        const table = this.getTableName(type);

        try {
            const stats = await dbGet(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END) as verified,
                    SUM(CASE WHEN expires_at < datetime('now') THEN 1 ELSE 0 END) as expired,
                    SUM(CASE WHEN attempts >= ? THEN 1 ELSE 0 END) as max_attempts
                 FROM ${table}
                 WHERE created_at > datetime('now', '-7 days')`,
                [this.MAX_ATTEMPTS]
            );

            return {
                total: stats.total || 0,
                verified: stats.verified || 0,
                expired: stats.expired || 0,
                maxAttemptsExceeded: stats.max_attempts || 0,
                verificationRate: stats.total > 0 ? ((stats.verified / stats.total) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return null;
        }
    }

    /**
     * Get table name based on OTP type
     * @param {string} type - OTP type
     * @returns {string} - Table name
     */
    getTableName(type) {
        const tableMap = {
            'sms': 'otp_codes',
            'email': 'email_otp_codes',
            'custom': 'custom_otp_codes'
        };

        return tableMap[type] || 'custom_otp_codes';
    }

    /**
     * Generate and store OTP (convenience method)
     * @param {string} type - OTP type
     * @param {string} identifier - User identifier
     * @returns {Object} - OTP and token info
     */
    async createOTP(type, identifier) {
        const otp = this.generateOTP();
        const token = this.generateToken();
        const result = await this.storeOTP(type, identifier, otp, token);

        return {
            otp,
            token: result.token,
            expiresAt: result.expiresAt,
            expiresIn: result.expiresIn
        };
    }
}

// Export singleton instance
module.exports = new OTPService();
