const { User } = require('../models');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail, testEmailConfig } = require('../utils/email');

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * @desc    Register user
 * @route   POST /api/users/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      verificationToken,
      tokenExpiry,
      isVerified: false
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, username);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account. Check server console for email preview link.',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified
        }
      });
    } catch (emailError) {
      logger.error(`Email sending failed: ${emailError.message}`);
      res.status(201).json({
        success: true,
        message: 'User registered successfully, but verification email could not be sent.',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified
        }
      });
    }

  } catch (err) {
    logger.error(`Error registering user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/users/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with verification token
    const user = await User.findOne({
      verificationToken: token,
      tokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationToken = null;
    user.tokenExpiry = null;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verified for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified
      }
    });

  } catch (err) {
    logger.error(`Error verifying email: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/users/resend-verification
 * @access  Public
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    user.verificationToken = verificationToken;
    user.tokenExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(email, verificationToken, user.username);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully. Please check your email.'
    });

  } catch (err) {
    logger.error(`Error resending verification email: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for verification link.',
        needsVerification: true
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = user.getSignedJwtToken();

    // Set cookie options
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true;
    }

    res
      .status(200)
      .cookie('token', token, cookieOptions)
      .json({
        success: true,
        token,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          preferences: user.preferences,
          isVerified: user.isVerified
        }
      });
  } catch (err) {
    logger.error(`Error logging in user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/users/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    logger.error(`Error getting user profile: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    // Fields to update
    const fieldsToUpdate = {
      username: req.body.username,
      email: req.body.email,
      bio: req.body.bio,
      profilePicture: req.body.profilePicture,
      preferences: req.body.preferences
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    logger.error(`Error updating user profile: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/users/updatepassword
 * @access  Private
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      message: 'Password updated successfully'
    });
  } catch (err) {
    logger.error(`Error updating password: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   GET /api/users/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    logger.error(`Error logging out user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        message: 'EMAIL_USER or EMAIL_PASS not configured'
      });
    }

    // Test Gmail configuration
    const isConfigValid = await testEmailConfig();
    if (!isConfigValid) {
      return res.status(500).json({
        success: false,
        message: 'Gmail configuration failed. Check your app password.'
      });
    }

    // Send test email via Gmail
    await sendVerificationEmail(email, 'test-token-123', 'Test User');
    
    res.status(200).json({
      success: true,
      message: 'Gmail test email sent successfully! Check your inbox.'
    });
  } catch (error) {
    logger.error(`Gmail test error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Gmail sending failed: ${error.message}`
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  testEmail,
  getMe,
  updateProfile,
  updatePassword,
  logout
};
