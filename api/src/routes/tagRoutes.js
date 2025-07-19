const express = require('express');
const {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getTagNotes
} = require('../controllers/tagController');

// Middleware
const { protect } = require('../middleware/auth');

const router = express.Router();

// Tag routes
router
  .route('/')
  .get(protect, getTags)
  .post(protect, createTag);

router
  .route('/:id')
  .get(protect, getTag)
  .put(protect, updateTag)
  .delete(protect, deleteTag);

// Get notes with specific tag
router.get('/:id/notes', protect, getTagNotes);

module.exports = router;