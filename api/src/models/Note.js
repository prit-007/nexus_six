const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for the note'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Note content cannot be empty']
  },
  isProtected: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false // Don't return password in queries by default
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  /**
   * isPublic: Controls note visibility and sharing
   * - true: Note can be viewed by anyone with the link, appears in public searches
   * - false: Note is private, only visible to the owner and explicitly shared users
   * Use cases: Sharing knowledge, tutorials, public documentation
   */
  isPublic: {
    type: Boolean,
    default: false
  },
  /**
   * isArchived: Controls note visibility in regular views
   * - true: Note is archived (hidden from main views but not deleted)
   * - false: Note is active and visible in normal views
   * Use cases: Organizing workspace, hiding old notes without deletion, temporary storage
   */
  isArchived: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  lastCalculationResult: {
    type: Object,
    default: {}
  },
  variables: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    calculationEnabled: {
      type: Boolean,
      default: true
    },
    lineReferencingEnabled: {
      type: Boolean,
      default: true
    },
    autoCalculate: {
      type: Boolean,
      default: true
    },
    decimalPrecision: {
      type: Number,
      default: 2
    },
    currencySymbol: {
      type: String,
      default: '$'
    }
  },
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date
  },
  // Version control and auto-save fields
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  // Auto-save metadata
  autoSaveEnabled: {
    type: Boolean,
    default: true
  },
  lastAutoSave: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for note versions
NoteSchema.virtual('versions', {
  ref: 'NoteVersion',
  localField: '_id',
  foreignField: 'note',
  justOne: false
});

// Create a text index for searching
NoteSchema.index({ title: 'text', content: 'text' });
NoteSchema.index({ user: 1, isArchived: 1 });
NoteSchema.index({ lastModified: -1 });
NoteSchema.index({ version: -1 });

// Virtual for checking if note has been modified recently (for auto-save)
NoteSchema.virtual('isRecentlyModified').get(function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastModified > fiveMinutesAgo;
});

// Middleware to increment version on save
NoteSchema.pre('save', async function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    this.version += 1;
    this.lastModified = new Date();
  }
  
  // Create version history for significant changes
  if (this.isModified('content') || this.isModified('title')) {
    // Only create version if this is not a new document
    if (!this.isNew) {
      try {
        const NoteVersion = require('./NoteVersion');
        // Create version with previous data (before current changes)
        const originalNote = await this.constructor.findById(this._id);
        if (originalNote) {
          await NoteVersion.createFromNote(originalNote, 'edit', 'Content modified');
        }
      } catch (error) {
        console.error('Error creating version:', error);
        // Don't block the save if version creation fails
      }
    }
  }
  
  next();
});

// Middleware to handle password protection
NoteSchema.pre('save', async function(next) {
  if (this.isProtected && this.isModified('password')) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to verify note password
NoteSchema.methods.verifyPassword = async function(enteredPassword) {
  if (!this.isProtected) return true;
  
  const bcrypt = require('bcryptjs');
  // Need to select the password field explicitly since it's not included by default
  const note = await this.constructor.findById(this._id).select('+password');
  return await bcrypt.compare(enteredPassword, note.password);
};

module.exports = mongoose.model('Note', NoteSchema);