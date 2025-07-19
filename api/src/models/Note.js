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
  isPublic: {
    type: Boolean,
    default: false
  },
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