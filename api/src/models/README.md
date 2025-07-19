# Database Models for CalcNote API

## Overview

This directory contains the Mongoose schema models for the CalcNote application, a note-taking platform with calculation features. The database design follows a relational structure using MongoDB's document model.

## Models

### User

Stores user information and preferences.

- **Fields**: username, email, password (hashed), profile information, preferences
- **Relationships**: One-to-many with Notes, Tags, and Groups
- **Features**: Password hashing, JWT token generation, preference settings

### Note

Stores the actual note content with calculation capabilities.

- **Fields**: title, content (HTML), protection settings, metadata, calculation results
- **Relationships**: 
  - Belongs to a User
  - Can belong to a Group
  - Can have multiple Tags
  - Has many NoteVersions
- **Features**: Password protection, calculation metadata, variable storage

### NoteVersion

Stores previous versions of notes for history tracking.

- **Fields**: note reference, title, content, version number, calculation results
- **Relationships**: Belongs to a Note and a User (who created the version)
- **Features**: Version tracking, ability to restore previous versions

### Tag

Allows categorization of notes.

- **Fields**: name, color, description, usage statistics
- **Relationships**: 
  - Belongs to a User
  - Many-to-many with Notes
- **Features**: Color coding, usage tracking

### Group

Allows organizing notes into folders/groups.

- **Fields**: name, description, color, icon, sharing settings
- **Relationships**: 
  - Belongs to a User
  - Can have a parent Group (hierarchical structure)
  - Has many Notes
  - Has many child Groups
- **Features**: Hierarchical organization, sharing capabilities

## Database Relationships

```
User 1:N Notes
User 1:N Tags
User 1:N Groups
Note N:1 User
Note N:1 Group (optional)
Note N:M Tags
Note 1:N NoteVersions
Group N:1 User
Group N:1 Group (parent, optional)
Tag N:1 User
```

## Special Features

- **Password Protection**: Notes can be individually password-protected
- **Version History**: All changes to notes are tracked with version history
- **Calculation Support**: Notes store calculation metadata and results
- **Hierarchical Groups**: Groups can be nested for better organization
- **User Preferences**: User-specific settings for theme, decimal precision, etc.

## Usage Examples

```javascript
// Creating a new note with tags
const user = await User.findById(userId);
const tag = await Tag.findOne({ name: 'Expenses', user: userId });

const note = await Note.create({
  title: 'Monthly Budget',
  content: 'Rent: 950\nGroceries: 300\nTotal: =950+300',
  user: userId,
  tags: [tag._id],
  metadata: {
    calculationEnabled: true,
    decimalPrecision: 2
  }
});

// Creating a version
await NoteVersion.createFromNote(note._id, userId, 'Initial version');

// Finding notes with specific tags
const notes = await Note.find({
  user: userId,
  tags: tagId
}).populate('tags');
```