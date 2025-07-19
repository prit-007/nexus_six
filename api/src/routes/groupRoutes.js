const express = require('express');
const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupNotes,
  getGroupPath
} = require('../controllers/groupController');

// Middleware
const { protect } = require('../middleware/auth');

const router = express.Router();

// Group routes
router
  .route('/')
  .get(protect, getGroups)
  .post(protect, createGroup);

router
  .route('/:id')
  .get(protect, getGroup)
  .put(protect, updateGroup)
  .delete(protect, deleteGroup);

// Get notes in a group
router.get('/:id/notes', protect, getGroupNotes);

// Get group path (breadcrumbs)
router.get('/:id/path', protect, getGroupPath);

module.exports = router;