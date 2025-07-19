const { User } = require('../models');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

/**
 * @desc    Register user
 * @route   POST /api/users/register
 * @access  Public
 */
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with that email or username already exists'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    logger.error(`Error registering user: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user has a valid token in the request
    let token;
    let existingToken = false;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      existingToken = true;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      existingToken = true;
    }
    
    // If token exists, verify it's still valid
    if (existingToken) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if the token belongs to the same user
        if (decoded.id === user._id.toString()) {
          // Update last login
          user.lastLogin = Date.now();
          await user.save({ validateBeforeSave: false });
          
          // Return the existing valid token
          return res.status(200).json({
            success: true,
            token,
            data: {
              id: user._id,
              username: user.username,
              email: user.email,
              preferences: user.preferences
            },
            message: 'Using existing valid token'
          });
        }
      } catch (error) {
        // Token verification failed, generate a new token
        logger.info(`Token verification failed, generating new token: ${error.message}`);
      }
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate new token
    token = user.getSignedJwtToken();

    // Set cookie options
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    // Set secure flag in production
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
          preferences: user.preferences
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
exports.getMe = async (req, res) => {
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
exports.updateProfile = async (req, res) => {
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
exports.updatePassword = async (req, res) => {
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
exports.logout = async (req, res) => {
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