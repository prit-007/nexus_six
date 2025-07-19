const { Group, Note } = require('../models');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * @desc    Get all groups for the logged in user
 * @route   GET /api/groups
 * @access  Private
 */
exports.getGroups = async (req, res) => {
  try {
    // Build query
    const query = { user: req.user.id };
    
    // Filter by parent if provided
    if (req.query.parent) {
      query.parent = req.query.parent === 'null' ? null : req.query.parent;
    }
    
    // Filter by archived status
    if (req.query.archived) {
      query.isArchived = req.query.archived === 'true';
    } else {
      // By default, exclude archived groups
      query.isArchived = false;
    }

    const groups = await Group.find(query)
      .populate('parent', 'name')
      .sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    logger.error(`Error getting groups: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get single group
 * @route   GET /api/groups/:id
 * @access  Private
 */
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('parent', 'name');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Make sure user owns the group or it's shared with them
    const isOwner = group.user.toString() === req.user.id;
    const isSharedWithUser = group.isShared && group.sharedWith.some(
      share => share.user.toString() === req.user.id
    );
    
    if (!isOwner && !isSharedWithUser) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this group'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    logger.error(`Error getting group: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Create new group
 * @route   POST /api/groups
 * @access  Private
 */
exports.createGroup = async (req, res) => {
  try {
    // Add user to request body
    req.body.user = req.user.id;

    // Check if parent exists and belongs to user
    if (req.body.parent) {
      const parent = await Group.findById(req.body.parent);
      
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent group not found'
        });
      }
      
      if (parent.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to use this parent group'
        });
      }
    }

    // Check if group with same name already exists in the same parent
    const existingGroup = await Group.findOne({
      name: req.body.name,
      user: req.user.id,
      parent: req.body.parent || null
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Group with this name already exists in the same location'
      });
    }

    // Create group
    const group = await Group.create(req.body);

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (err) {
    logger.error(`Error creating group: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private
 */
exports.updateGroup = async (req, res) => {
  try {
    let group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Make sure user owns the group
    if (group.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this group'
      });
    }

    // Check if new parent exists and belongs to user
    if (req.body.parent) {
      // Prevent setting parent to self
      if (req.body.parent === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Group cannot be its own parent'
        });
      }
      
      const parent = await Group.findById(req.body.parent);
      
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent group not found'
        });
      }
      
      if (parent.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to use this parent group'
        });
      }
      
      // Check for circular reference
      let currentParent = parent;
      while (currentParent.parent) {
        if (currentParent.parent.toString() === req.params.id) {
          return res.status(400).json({
            success: false,
            message: 'Circular reference detected in group hierarchy'
          });
        }
        currentParent = await Group.findById(currentParent.parent);
      }
    }

    // Check if new name conflicts with existing group in the same parent
    if (req.body.name && req.body.name !== group.name) {
      const parentToCheck = req.body.parent !== undefined ? req.body.parent : group.parent;
      
      const existingGroup = await Group.findOne({
        name: req.body.name,
        user: req.user.id,
        parent: parentToCheck || null,
        _id: { $ne: req.params.id } // Exclude current group
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'Group with this name already exists in the same location'
        });
      }
    }

    // Update group
    group = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    logger.error(`Error updating group: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private
 */
exports.deleteGroup = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const group = await Group.findById(req.params.id).session(session);

      if (!group) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Make sure user owns the group
      if (group.user.toString() !== req.user.id) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this group'
        });
      }

      // Check if group has child groups
      const childGroups = await Group.find({ parent: req.params.id }).session(session);
      
      if (childGroups.length > 0 && !req.query.force) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Group has child groups. Use force=true to delete anyway',
          childCount: childGroups.length
        });
      }

      // Check if group has notes
      const notes = await Note.find({ group: req.params.id }).session(session);
      
      if (notes.length > 0 && !req.query.force) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Group has notes. Use force=true to delete anyway',
          noteCount: notes.length
        });
      }

      // If force=true, move all notes to parent group or null
      if (req.query.force === 'true') {
        await Note.updateMany(
          { group: req.params.id },
          { group: group.parent },
          { session }
        );
        
        // Update child groups to have the same parent as this group
        await Group.updateMany(
          { parent: req.params.id },
          { parent: group.parent },
          { session }
        );
      }

      // Delete group
      await group.deleteOne({ session });
      
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    logger.error(`Error deleting group: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Get notes in a group
 * @route   GET /api/groups/:id/notes
 * @access  Private
 */
exports.getGroupNotes = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Make sure user owns the group or it's shared with them
    const isOwner = group.user.toString() === req.user.id;
    const isSharedWithUser = group.isShared && group.sharedWith.some(
      share => share.user.toString() === req.user.id
    );
    
    if (!isOwner && !isSharedWithUser) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this group'
      });
    }

    // Check if we should include notes from subgroups
    const includeSubgroups = req.query.includeSubgroups === 'true';
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    let notes;
    let total;
    
    if (includeSubgroups) {
      // Get all subgroups
      const subgroups = await Group.find({
        $or: [
          { _id: req.params.id },
          { parent: req.params.id }
        ]
      });
      
      const groupIds = subgroups.map(g => g._id);
      
      // Get notes from all groups and subgroups
      total = await Note.countDocuments({
        group: { $in: groupIds },
        user: req.user.id
      });
      
      notes = await Note.find({
        group: { $in: groupIds },
        user: req.user.id
      })
        .populate('tags', 'name color')
        .populate('group', 'name')
        .skip(startIndex)
        .limit(limit)
        .sort({ updatedAt: -1 });
    } else {
      // Get notes only from this group
      total = await Note.countDocuments({
        group: req.params.id,
        user: req.user.id
      });
      
      notes = await Note.find({
        group: req.params.id,
        user: req.user.id
      })
        .populate('tags', 'name color')
        .populate('group', 'name')
        .skip(startIndex)
        .limit(limit)
        .sort({ updatedAt: -1 });
    }

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
    logger.error(`Error getting group notes: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * @desc    Get group path (breadcrumbs)
 * @route   GET /api/groups/:id/path
 * @access  Private
 */
exports.getGroupPath = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Make sure user owns the group or it's shared with them
    const isOwner = group.user.toString() === req.user.id;
    const isSharedWithUser = group.isShared && group.sharedWith.some(
      share => share.user.toString() === req.user.id
    );
    
    if (!isOwner && !isSharedWithUser) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this group'
      });
    }

    // Get path
    const path = await group.getPath();

    res.status(200).json({
      success: true,
      data: path
    });
  } catch (err) {
    logger.error(`Error getting group path: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};