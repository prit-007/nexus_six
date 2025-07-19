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
  versionNumber: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  calculationResults: {
    type: Object,
    default: {}
  },
  variables: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: Object,
    default: {}
  },
  changeDescription: {
    type: String,
    default: 'Version update'
  }
}, {
  timestamps: true
});

// Compound index to ensure unique version numbers per note
NoteVersionSchema.index({ note: 1, versionNumber: 1 }, { unique: true });

// Static method to create a new version from a note
NoteVersionSchema.statics.createFromNote = async function(noteId, userId, changeDescription = 'Version update') {
  const Note = mongoose.model('Note');
  const note = await Note.findById(noteId);
  
  if (!note) {
    throw new Error('Note not found');
  }
  
  // Get the latest version number
  const latestVersion = await this.findOne({ note: noteId }).sort('-versionNumber');
  const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
  
  // Create new version
  return this.create({
    note: noteId,
    title: note.title,
    content: note.content,
    versionNumber,
    createdBy: userId,
    calculationResults: note.lastCalculationResult,
    variables: note.variables,
    metadata: note.metadata,
    changeDescription
  });
};

module.exports = mongoose.model('NoteVersion', NoteVersionSchema);