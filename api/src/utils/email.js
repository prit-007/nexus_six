const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create Gmail transporter
const createGmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS environment variables must be set');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  logger.info(`Gmail transporter created for: ${process.env.EMAIL_USER}`);
  return transporter;
};

// Send verification email via Gmail
const sendVerificationEmail = async (email, verificationToken, username) => {
  try {
    logger.info(`Attempting to send verification email to: ${email}`);
    
    const transporter = createGmailTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"CalcNote" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - CalcNote',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">Welcome to CalcNote!</h2>
          <p>Hi ${username},</p>
          <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #8B5CF6, #EC4899); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #6B7280;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 12px;">CalcNote Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Gmail email sent successfully to ${email}`);
    
    console.log('='.repeat(50));
    console.log('GMAIL EMAIL SENT SUCCESSFULLY!');
    console.log(`To: ${email}`);
    console.log(`Message ID: ${result.messageId}`);
    console.log('='.repeat(50));
    
    return true;
  } catch (error) {
    logger.error(`Error sending Gmail verification email: ${error.message}`);
    throw error;
  }
};

// Test Gmail configuration
const testEmailConfig = async () => {
  try {
    const transporter = createGmailTransporter();
    await transporter.verify();
    logger.info('Gmail configuration is valid');
    return true;
  } catch (error) {
    logger.error(`Gmail configuration error: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  testEmailConfig
};



