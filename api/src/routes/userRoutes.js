const express = require('express');
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updatePassword,
  logout
} = require('../controllers/userController');

// Middleware
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;