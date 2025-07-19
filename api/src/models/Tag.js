const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    trim: true,
    maxlength: [30, 'Tag name cannot exceed 30 characters']
  },
  color: {
    type: String,
    default: '#3498db', // Default blue color
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    maxlength: [100, 'Description cannot exceed 100 characters']
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique tag names per user
TagSchema.index({ name: 1, user: 1 }, { unique: true });

// Virtual for notes with this tag
TagSchema.virtual('notes', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'tags',
  justOne: false
});

// Middleware to update usage count when a tag is added to a note
TagSchema.statics.updateUsageCount = async function(tagId) {
  const Note = mongoose.model('Note');
  const count = await Note.countDocuments({ tags: tagId });
  
  await this.findByIdAndUpdate(tagId, { usageCount: count });
};

module.exports = mongoose.model('Tag', TagSchema);