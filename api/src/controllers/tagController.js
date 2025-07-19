const { Tag, Note } = require('../models');
const logger = require('../utils/logger');

/**
 * @desc    Get all tags for the logged in user
 * @route   GET /api/tags
 * @access  Private
 */
exports.getTags = async (req, res) => {
  try {
    const tags = await Tag.find({ user: req.user.id })
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (err) {
    logger.error(`Error getting tags: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get single tag
 * @route   GET /api/tags/:id
 * @access  Private
 */
exports.getTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Make sure user owns the tag
    if (tag.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this tag'
      });
    }

    res.status(200).json({
      success: true,
      data: tag
    });
  } catch (err) {
    logger.error(`Error getting tag: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Create new tag
 * @route   POST /api/tags
 * @access  Private
 */
exports.createTag = async (req, res) => {
  try {
    // Add user to request body
    req.body.user = req.user.id;

    // Check if tag with same name already exists for this user
    const existingTag = await Tag.findOne({
      name: req.body.name,
      user: req.user.id
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists'
      });
    }

    // Create tag
    const tag = await Tag.create(req.body);

    res.status(201).json({
      success: true,
      data: tag
    });
  } catch (err) {
    logger.error(`Error creating tag: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Update tag
 * @route   PUT /api/tags/:id
 * @access  Private
 */
exports.updateTag = async (req, res) => {
  try {
    let tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Make sure user owns the tag
    if (tag.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tag'
      });
    }

    // Check if new name conflicts with existing tag
    if (req.body.name && req.body.name !== tag.name) {
      const existingTag = await Tag.findOne({
        name: req.body.name,
        user: req.user.id
      });

      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'Tag with this name already exists'
        });
      }
    }

    // Update tag
    tag = await Tag.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: tag
    });
  } catch (err) {
    logger.error(`Error updating tag: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Delete tag
 * @route   DELETE /api/tags/:id
 * @access  Private
 */
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Make sure user owns the tag
    if (tag.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tag'
      });
    }

    // Remove tag from all notes
    await Note.updateMany(
      { tags: req.params.id },
      { $pull: { tags: req.params.id } }
    );

    // Delete tag
    await tag.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    logger.error(`Error deleting tag: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Get notes with specific tag
 * @route   GET /api/tags/:id/notes
 * @access  Private
 */
exports.getTagNotes = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Make sure user owns the tag
    if (tag.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this tag'
      });
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // Get notes with this tag
    const total = await Note.countDocuments({
      user: req.user.id,
      tags: req.params.id
    });

    const notes = await Note.find({
      user: req.user.id,
      tags: req.params.id
    })
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
    logger.error(`Error getting tag notes: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};