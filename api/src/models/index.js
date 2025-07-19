// Export all models for easier importing
const User = require('./User');
const Note = require('./Note');
const NoteVersion = require('./NoteVersion');
const Tag = require('./Tag');
const Group = require('./Group');

module.exports = {
  User,
  Note,
  NoteVersion,
  Tag,
  Group
};