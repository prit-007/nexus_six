const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check if token exists in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id).select('-password');

    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // BLOCK ACCESS if email is not verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required to access this resource',
        needsVerification: true
      });
    }

    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Middleware to check email verification for protected routes
 */
const requireEmailVerification = async (req, res, next) => {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required to access this resource',
        needsVerification: true
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  protect,
  authorize,
  requireEmailVerification
};
