const express = require('express');
const { 
  getNotes, 
  getNote, 
  createNote, 
  updateNote, 
  deleteNote,
  getNoteVersions,
  getNoteVersion,
  restoreNoteVersion
} = require('../controllers/noteController');

// Middleware
const { protect } = require('../middleware/auth');

const router = express.Router();

// Note routes
router
  .route('/')
  .get(protect, getNotes)
  .post(protect, createNote);

router
  .route('/:id')
  .get(protect, getNote)
  .put(protect, updateNote)
  .delete(protect, deleteNote);

// Note version routes
router
  .route('/:id/versions')
  .get(protect, getNoteVersions);

router
  .route('/:id/versions/:versionId')
  .get(protect, getNoteVersion);

router
  .route('/:id/versions/:versionId/restore')
  .post(protect, restoreNoteVersion);

module.exports = router;