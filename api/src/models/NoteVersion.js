const mongoose = require('mongoose');

const NoteVersionSchema = new mongoose.Schema({
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Metadata at the time of this version
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
  variables: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastCalculationResult: {
    type: Object,
    default: {}
  },
  // Change tracking
  changeType: {
    type: String,
    enum: ['create', 'edit', 'auto-save', 'manual-save', 'close-save'],
    default: 'edit'
  },
  changeDescription: {
    type: String,
    maxlength: 500,
    default: 'Version update'
  }
}, {
  timestamps: true
});

// Indexes for performance
NoteVersionSchema.index({ note: 1, version: -1 });
NoteVersionSchema.index({ note: 1, createdAt: -1 });
NoteVersionSchema.index({ user: 1, createdAt: -1 });

// Static method to create version from note
NoteVersionSchema.statics.createFromNote = async function(note, changeType = 'edit', changeDescription = 'Version update') {
  const versionData = {
    note: note._id,
    title: note.title,
    content: note.content,
    version: note.version,
    user: note.user,
    metadata: note.metadata,
    variables: note.variables,
    lastCalculationResult: note.lastCalculationResult,
    changeType,
    changeDescription
  };
  
  const version = new this(versionData);
  return await version.save();
};

// Method to restore note to this version
NoteVersionSchema.methods.restoreToNote = async function() {
  const Note = require('./Note');
  
  const note = await Note.findById(this.note);
  if (!note) {
    throw new Error('Note not found');
  }
  
  // Update note with version data
  note.title = this.title;
  note.content = this.content;
  note.metadata = this.metadata;
  note.variables = this.variables;
  note.lastCalculationResult = this.lastCalculationResult;
  note.lastModified = new Date();
  
  return await note.save();
};

module.exports = mongoose.model('NoteVersion', NoteVersionSchema);