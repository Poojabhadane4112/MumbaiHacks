/**
 * Notification Service - Centralized notification delivery
 * Supports SMS, Email, and Push notifications
 */

class NotificationService {
    constructor() {
        this.twilioClient = null;
        this.emailTransporter = null;
        this.enableSMS = process.env.ENABLE_SMS === 'true';
        this.enableEmail = process.env.ENABLE_EMAIL === 'true';
        
        this.initializeServices();
    }

    /**
     * Initialize notification services
     */
    initializeServices() {
        // Initialize Twilio for SMS
        if (this.enableSMS) {
            try {
                const twilio = require('twilio');
                this.twilioClient = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                console.log('✅ Twilio SMS service initialized');
            } catch (error) {
                console.warn('⚠️ Twilio not configured:', error.message);
            }
        }

        // Initialize Email service (Nodemailer)
        if (this.enableEmail) {
            try {
                const nodemailer = require('nodemailer');
                this.emailTransporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_APP_PASSWORD
                    }
                });
                console.log('✅ Email service initialized');
            } catch (error) {
                console.warn('⚠️ Email service not configured:', error.message);
            }
        }
    }

    /**
     * Send SMS notification
     * @param {string} mobile - Mobile number
     * @param {string} message - Message to send
     * @returns {Object} - Send result
     */
    async sendSMS(mobile, message) {
        if (this.enableSMS && this.twilioClient) {
            try {
                const result = await this.twilioClient.messages.create({
                    body: message,
                    to: mobile,
                    from: process.env.TWILIO_PHONE_NUMBER
                });
                
                console.log(`✅ SMS sent to ${mobile} - SID: ${result.sid}`);
                return { success: true, messageId: result.sid };
            } catch (error) {
                console.error('❌ SMS error:', error.message);
                // Fallback to console logging
                this.logSMS(mobile, message);
                return { success: true, fallback: true };
            }
        } else {
            // Development mode - log to console
            this.logSMS(mobile, message);
            return { success: true, development: true };
        }
    }

    /**
     * Send Email notification
     * @param {string} email - Email address
     * @param {string} subject - Email subject
     * @param {string} html - Email HTML content
     * @returns {Object} - Send result
     */
    async sendEmail(email, subject, html) {
        if (this.enableEmail && this.emailTransporter) {
            try {
                const info = await this.emailTransporter.sendMail({
                    from: `"${process.env.APP_NAME || 'Fincoach'}" <${process.env.EMAIL_FROM || 'noreply@fincoach.com'}>`,
                    to: email,
                    subject: subject,
                    html: html
                });
                
                console.log(`✅ Email sent to ${email} - ID: ${info.messageId}`);
                return { success: true, messageId: info.messageId };
            } catch (error) {
                console.error('❌ Email error:', error.message);
                // Fallback to console logging
                this.logEmail(email, subject, html);
                return { success: true, fallback: true };
            }
        } else {
            // Development mode - log to console
            this.logEmail(email, subject, html);
            return { success: true, development: true };
        }
    }

    /**
     * Send OTP via SMS
     * @param {string} mobile - Mobile number
     * @param {string} otp - OTP code
     * @returns {Object} - Send result
     */
    async sendOTPSMS(mobile, otp) {
        const message = `Your ${process.env.APP_NAME || 'Fincoach'} verification code is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
        return await this.sendSMS(mobile, message);
    }

    /**
     * Send OTP via Email
     * @param {string} email - Email address
     * @param {string} otp - OTP code
     * @returns {Object} - Send result
     */
    async sendOTPEmail(email, otp) {
        const subject = `${process.env.APP_NAME || 'Fincoach'} - Verification Code`;
        const html = this.getOTPEmailTemplate(otp);
        return await this.sendEmail(email, subject, html);
    }

    /**
     * Get OTP email template
     * @param {string} otp - OTP code
     * @returns {string} - HTML template
     */
    getOTPEmailTemplate(otp) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 0;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center;">
                                        <h1 style="color: #6366f1; margin: 0; font-size: 32px; font-weight: 800;">Fincoach</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 20px; font-weight: 700;">Verification Code</h2>
                                        <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                            Use the verification code below to complete your request:
                                        </p>
                                        
                                        <!-- OTP Box -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; border-radius: 12px;">
                                                    <span style="color: #ffffff; font-size: 42px; font-weight: bold; letter-spacing: 12px;">${otp}</span>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="color: #64748b; font-size: 14px; margin: 24px 0 0; line-height: 1.6;">
                                            This code will expire in <strong style="color: #1e293b;">10 minutes</strong>.
                                        </p>
                                        <p style="color: #64748b; font-size: 14px; margin: 12px 0 0; line-height: 1.6;">
                                            If you didn't request this code, please ignore this email or contact support if you have concerns.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; border-radius: 0 0 12px 12px;">
                                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                            © ${new Date().getFullYear()} Fincoach. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
    }

    /**
     * Log SMS to console (development mode)
     */
    logSMS(mobile, message) {
        console.log('\n📱 ═══════════════════════════════════════════════════');
        console.log(`📱 SMS to: ${mobile}`);
        console.log(`📱 Message: ${message}`);
        console.log('📱 ═══════════════════════════════════════════════════\n');
        console.log('💡 To enable real SMS, set ENABLE_SMS=true in .env\n');
    }

    /**
     * Log Email to console (development mode)
     */
    logEmail(email, subject, html) {
        console.log('\n📧 ═══════════════════════════════════════════════════');
        console.log(`📧 Email to: ${email}`);
        console.log(`📧 Subject: ${subject}`);
        console.log(`📧 Content: [HTML Email - Check browser for preview]`);
        console.log('📧 ═══════════════════════════════════════════════════\n');
        console.log('💡 To enable real emails, set ENABLE_EMAIL=true in .env\n');
    }
}

// Export singleton instance
module.exports = new NotificationService();
