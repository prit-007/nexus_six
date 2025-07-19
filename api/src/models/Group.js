const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  color: {
    type: String,
    default: '#2ecc71', // Default green color
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  icon: {
    type: String,
    default: 'folder'
  },
  isShared: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'read'
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique group names per user and parent
GroupSchema.index({ name: 1, user: 1, parent: 1 }, { unique: true });

// Virtual for notes in this group
GroupSchema.virtual('notes', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'group',
  justOne: false
});

// Virtual for child groups
GroupSchema.virtual('children', {
  ref: 'Group',
  localField: '_id',
  foreignField: 'parent',
  justOne: false
});

// Method to get full path of group (for breadcrumbs)
GroupSchema.methods.getPath = async function() {
  const path = [];
  let currentGroup = this;
  
  while (currentGroup) {
    path.unshift({
      _id: currentGroup._id,
      name: currentGroup.name
    });
    
    if (currentGroup.parent) {
      currentGroup = await this.constructor.findById(currentGroup.parent);
    } else {
      currentGroup = null;
    }
  }
  
  return path;
};

// Static method to get all notes in a group and its subgroups
GroupSchema.statics.getAllNotesInGroupAndSubgroups = async function(groupId) {
  const Note = mongoose.model('Note');
  const groups = await this.find({ $or: [{ _id: groupId }, { parent: groupId }] });
  const groupIds = groups.map(group => group._id);
  
  return Note.find({ group: { $in: groupIds } });
};

module.exports = mongoose.model('Group', GroupSchema);