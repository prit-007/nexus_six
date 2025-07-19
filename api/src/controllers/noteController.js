const { Note, NoteVersion, Tag } = require('../models');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * @desc    Get all notes for the logged in user
 * @route   GET /api/notes
 * @access  Private
 */
exports.getNotes = async (req, res) => {
  try {
    // Build query with filters
    const query = { user: req.user.id };
    
    // Filter by group if provided
    if (req.query.group) {
      query.group = req.query.group;
    }
    
    // Filter by tags if provided
    if (req.query.tags) {
      const tagIds = req.query.tags.split(',');
      query.tags = { $in: tagIds };
    }
    
    // Filter by archived status
    if (req.query.archived) {
      query.isArchived = req.query.archived === 'true';
    } else {
      // By default, exclude archived notes
      query.isArchived = false;
    }
    
    // Filter by favorite status
    if (req.query.favorite) {
      query.isFavorite = req.query.favorite === 'true';
    }
    
    // Search by title or content
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Note.countDocuments(query);

    // Execute query with pagination
    const notes = await Note.find(query)
      .populate('tags', 'name color')
      .populate('group', 'name')
      .skip(startIndex)
      .limit(limit)
      .sort({ updatedAt: -1 });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: notes.length,
      pagination,
      data: notes
    });
  } catch (err) {
    logger.error(`Error getting notes: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get single note
 * @route   GET /api/notes/:id
 * @access  Private
 */
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('tags', 'name color')
      .populate('group', 'name')
      .populate('user', 'username');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check if note belongs to user or is public
    if (note.user._id.toString() !== req.user.id && !note.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this note'
      });
    }

    // Check if note is password protected
    if (note.isProtected) {
      // If password is not provided in request
      if (!req.body.password) {
        return res.status(401).json({
          success: false,
          message: 'This note is password protected',
          isProtected: true
        });
      }
      
      // Verify password
      const isMatch = await note.verifyPassword(req.body.password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
          isProtected: true
        });
      }
    }

    // Increment view count
    note.viewCount += 1;
    note.lastViewedAt = Date.now();
    await note.save();

    res.status(200).json({
      success: true,
      data: note
    });
  } catch (err) {
    logger.error(`Error getting note: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Create new note
 * @route   POST /api/notes
 * @access  Private
 */
exports.createNote = async (req, res) => {
  try {
    // Add user to request body
    req.body.user = req.user.id;
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create note
      const note = await Note.create([req.body], { session });
      
      // Create initial version
      await NoteVersion.createFromNote(
        note[0]._id,
        req.user.id,
        'Initial version',
        session
      );
      
      // Update tag usage counts if tags are provided
      if (req.body.tags && req.body.tags.length > 0) {
        for (const tagId of req.body.tags) {
          await Tag.updateUsageCount(tagId);
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(201).json({
        success: true,
        data: note[0]
      });
    } catch (err) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    logger.error(`Error creating note: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Update note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
exports.updateNote = async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Make sure user owns the note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this note'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create a version before updating
      await NoteVersion.createFromNote(
        note._id,
        req.user.id,
        req.body.changeDescription || 'Update',
        session
      );
      
      // Update note
      note = await Note.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
          session
        }
      );
      
      // Update tag usage counts if tags are modified
      if (req.body.tags) {
        // Get all unique tags (old and new)
        const oldTags = note.tags.map(tag => tag.toString());
        const newTags = req.body.tags;
        const allTags = [...new Set([...oldTags, ...newTags])];
        
        // Update usage count for all affected tags
        for (const tagId of allTags) {
          await Tag.updateUsageCount(tagId);
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        success: true,
        data: note
      });
    } catch (err) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    logger.error(`Error updating note: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Delete note
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Make sure user owns the note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this note'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Get tags before deletion for updating counts later
      const noteTags = [...note.tags];
      
      // Delete note
      await note.deleteOne({ session });
      
      // Delete all versions of the note
      await NoteVersion.deleteMany({ note: req.params.id }, { session });
      
      // Update tag usage counts
      for (const tagId of noteTags) {
        await Tag.updateUsageCount(tagId);
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    logger.error(`Error deleting note: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Get note versions
 * @route   GET /api/notes/:id/versions
 * @access  Private
 */
exports.getNoteVersions = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Make sure user owns the note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this note'
      });
    }

    // Get versions
    const versions = await NoteVersion.find({ note: req.params.id })
      .sort({ versionNumber: -1 })
      .select('-content'); // Exclude content for listing to reduce payload size

    res.status(200).json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (err) {
    logger.error(`Error getting note versions: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get specific note version
 * @route   GET /api/notes/:id/versions/:versionId
 * @access  Private
 */
exports.getNoteVersion = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Make sure user owns the note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this note'
      });
    }

    // Get specific version
    const version = await NoteVersion.findOne({
      _id: req.params.versionId,
      note: req.params.id
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    res.status(200).json({
      success: true,
      data: version
    });
  } catch (err) {
    logger.error(`Error getting note version: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Restore note to a specific version
 * @route   POST /api/notes/:id/versions/:versionId/restore
 * @access  Private
 */
exports.restoreNoteVersion = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Make sure user owns the note
    if (note.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this note'
      });
    }

    // Get specific version
    const version = await NoteVersion.findOne({
      _id: req.params.versionId,
      note: req.params.id
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create a version of current state before restoring
      await NoteVersion.createFromNote(
        note._id,
        req.user.id,
        'Pre-restore checkpoint',
        session
      );
      
      // Update note with version data
      note.title = version.title;
      note.content = version.content;
      note.lastCalculationResult = version.calculationResults;
      note.variables = version.variables;
      
      // Save note
      await note.save({ session });
      
      // Create a new version marking the restoration
      await NoteVersion.create([{
        note: note._id,
        title: note.title,
        content: note.content,
        versionNumber: (await NoteVersion.findOne({ note: note._id }).sort('-versionNumber')).versionNumber + 1,
        createdBy: req.user.id,
        calculationResults: note.lastCalculationResult,
        variables: note.variables,
        changeDescription: `Restored to version ${version.versionNumber}`
      }], { session });
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      res.status(200).json({
        success: true,
        data: note
      });
    } catch (err) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    logger.error(`Error restoring note version: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};