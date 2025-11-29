let mobileNumber = '';
let userEmail = '';
let otpToken = '';
let passkeyToken = '';
let recoveryMethod = '';
let contactInfo = '';
let timerInterval;
let timeLeft = 60;

// Auto-focus and move to next OTP input
document.addEventListener('DOMContentLoaded', () => {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        // Only allow numbers
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    });
});

// Show message helper
function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Select recovery method
function selectMethod(method) {
    recoveryMethod = method;
    document.getElementById('method-form').classList.remove('active');
    
    if (method === 'sms') {
        document.getElementById('mobile-form').classList.add('active');
        document.getElementById('mobile').focus();
    } else if (method === 'email') {
        document.getElementById('email-form').classList.add('active');
        document.getElementById('email-input').focus();
    } else if (method === 'passkey') {
        document.getElementById('passkey-form').classList.add('active');
        document.getElementById('passkey-email').focus();
    }
}

// Back to method selection
function backToMethodSelection() {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById('method-form').classList.add('active');
    recoveryMethod = '';
}

// Step 1a: Send SMS OTP
async function sendSMSOTP(event) {
    event.preventDefault();
    
    const mobile = document.getElementById('mobile').value;
    const sendBtn = document.getElementById('send-otp-btn');
    
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mobile })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mobileNumber = mobile;
            contactInfo = mobile;
            otpToken = data.data.otpToken;
            
            showMessage('success-msg', data.message);
            
            // Switch to OTP form
            setTimeout(() => {
                document.getElementById('mobile-form').classList.remove('active');
                document.getElementById('otp-form').classList.add('active');
                document.getElementById('display-contact').textContent = mobile;
                document.getElementById('otp1').focus();
                startTimer();
            }, 1500);
        } else {
            showMessage('error-msg', data.message);
        }
    } catch (error) {
        console.error('Send SMS OTP error:', error);
        showMessage('error-msg', 'Failed to send OTP. Please try again.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send OTP';
    }
}

// Step 1b: Send Email OTP
async function sendEmailOTP(event) {
    event.preventDefault();
    
    const email = document.getElementById('email-input').value;
    const sendBtn = document.getElementById('send-email-otp-btn');
    
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/forgot-password-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            userEmail = email;
            contactInfo = email;
            otpToken = data.data.otpToken;
            
            showMessage('email-success-msg', data.message);
            
            // Switch to OTP form
            setTimeout(() => {
                document.getElementById('email-form').classList.remove('active');
                document.getElementById('otp-form').classList.add('active');
                document.getElementById('display-contact').textContent = email;
                document.getElementById('otp1').focus();
                startTimer();
            }, 1500);
        } else {
            showMessage('email-error-msg', data.message);
        }
    } catch (error) {
        console.error('Send Email OTP error:', error);
        showMessage('email-error-msg', 'Failed to send code. Please try again.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Code';
    }
}

// Step 2: Verify OTP (works for both SMS and Email)
async function verifyOTP(event) {
    event.preventDefault();
    
    const otp = Array.from({length: 6}, (_, i) => 
        document.getElementById(`otp${i + 1}`).value
    ).join('');
    
    if (otp.length !== 6) {
        showMessage('otp-error-msg', 'Please enter all 6 digits');
        return;
    }
    
    const verifyBtn = document.getElementById('verify-otp-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        const requestBody = { otp, otpToken };
        
        // Add appropriate identifier based on recovery method
        if (recoveryMethod === 'sms') {
            requestBody.mobile = mobileNumber;
        } else if (recoveryMethod === 'email') {
            requestBody.email = userEmail;
        }
        
        const response = await fetch('http://localhost:3000/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('otp-success-msg', 'Code verified successfully!');
            clearInterval(timerInterval);
            
            // Switch to reset password form
            setTimeout(() => {
                document.getElementById('otp-form').classList.remove('active');
                document.getElementById('reset-form').classList.add('active');
            }, 1500);
        } else {
            showMessage('otp-error-msg', data.message);
            // Clear OTP inputs
            for (let i = 1; i <= 6; i++) {
                document.getElementById(`otp${i}`).value = '';
            }
            document.getElementById('otp1').focus();
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        showMessage('otp-error-msg', 'Failed to verify code. Please try again.');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Code';
    }
}

// Step 3: Reset Password
async function resetPassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showMessage('reset-error-msg', 'Passwords do not match!');
        return;
    }
    
    const resetBtn = document.getElementById('reset-password-btn');
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                mobile: mobileNumber,
                newPassword,
                otpToken
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('reset-success-msg', 'Password reset successful! Redirecting to login...');
            
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 2000);
        } else {
            showMessage('reset-error-msg', data.message);
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showMessage('reset-error-msg', 'Failed to reset password. Please try again.');
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset Password';
    }
}

// Timer for OTP resend
function startTimer() {
    timeLeft = 60;
    document.getElementById('timer-text').style.display = 'inline';
    document.getElementById('resend-link').style.display = 'none';
    
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-text').style.display = 'none';
            const resendLink = document.getElementById('resend-link');
            resendLink.style.display = 'inline';
            resendLink.classList.remove('disabled');
        }
    }, 1000);
}

// Resend OTP (works for both SMS and Email)
async function resendOTP() {
    const resendLink = document.getElementById('resend-link');
    
    if (resendLink.classList.contains('disabled')) {
        return;
    }
    
    resendLink.classList.add('disabled');
    
    try {
        let endpoint, requestBody;
        
        if (recoveryMethod === 'sms') {
            endpoint = 'http://localhost:3000/api/auth/forgot-password';
            requestBody = { mobile: mobileNumber };
        } else if (recoveryMethod === 'email') {
            endpoint = 'http://localhost:3000/api/auth/forgot-password-email';
            requestBody = { email: userEmail };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            otpToken = data.data.otpToken;
            showMessage('otp-success-msg', 'New code sent successfully!');
            
            // Clear previous OTP
            for (let i = 1; i <= 6; i++) {
                document.getElementById(`otp${i}`).value = '';
            }
            document.getElementById('otp1').focus();
            
            startTimer();
        } else {
            showMessage('otp-error-msg', data.message);
            resendLink.classList.remove('disabled');
        }
    } catch (error) {
        console.error('Resend code error:', error);
        showMessage('otp-error-msg', 'Failed to resend code. Please try again.');
        resendLink.classList.remove('disabled');
    }
}

// Back to contact form (mobile or email)
function backToContactForm(event) {
    event.preventDefault();
    clearInterval(timerInterval);
    document.getElementById('otp-form').classList.remove('active');
    
    if (recoveryMethod === 'sms') {
        document.getElementById('mobile-form').classList.add('active');
    } else if (recoveryMethod === 'email') {
        document.getElementById('email-form').classList.add('active');
    }
    
    // Clear OTP inputs
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`otp${i}`).value = '';
    }
}


// Verify Passkey
async function verifyPasskey(event) {
    event.preventDefault();
    
    const email = document.getElementById('passkey-email').value;
    const passkey = document.getElementById('passkey-input').value;
    const verifyBtn = document.getElementById('verify-passkey-btn');
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/verify-passkey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, passkey })
        });
        
        const data = await response.json();
        
        if (data.success) {
            userEmail = email;
            passkeyToken = data.data.passkeyToken;
            
            showMessage('passkey-success-msg', 'Passkey verified successfully!');
            
            // Switch to reset password form
            setTimeout(() => {
                document.getElementById('passkey-form').classList.remove('active');
                document.getElementById('reset-form').classList.add('active');
            }, 1500);
        } else {
            showMessage('passkey-error-msg', data.message);
        }
    } catch (error) {
        console.error('Verify passkey error:', error);
        showMessage('passkey-error-msg', 'Failed to verify passkey. Please try again.');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Passkey';
    }
}

// Update reset password to handle both methods
const originalResetPassword = resetPassword;
resetPassword = async function(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showMessage('reset-error-msg', 'Passwords do not match!');
        return;
    }
    
    const resetBtn = document.getElementById('reset-password-btn');
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';
    
    try {
        let requestBody = { newPassword };
        
        // Add appropriate authentication token based on recovery method
        if (recoveryMethod === 'sms' && mobileNumber) {
            requestBody.mobile = mobileNumber;
            requestBody.otpToken = otpToken;
        } else if (recoveryMethod === 'email' && userEmail) {
            requestBody.email = userEmail;
            requestBody.otpToken = otpToken;
        } else if (recoveryMethod === 'passkey' && userEmail) {
            requestBody.email = userEmail;
            requestBody.passkeyToken = passkeyToken;
        }
        
        const response = await fetch('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('reset-success-msg', 'Password reset successful! Redirecting to login...');
            
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 2000);
        } else {
            showMessage('reset-error-msg', data.message);
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showMessage('reset-error-msg', 'Failed to reset password. Please try again.');
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset Password';
    }
};
