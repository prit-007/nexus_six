const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Note = require('../models/Note');
const NoteVersion = require('../models/NoteVersion');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.openNotes = new Map(); // userId-noteId -> noteData
    this.autoSaveTimers = new Map(); // userId-noteId -> timerId
  }

  initialize(server) {
    this.io = require('socket.io')(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('Socket.IO server initialized for personal notes');
  }

  setupMiddleware() {
    // Authentication middleware for Socket.IO
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        logger.error(`Socket authentication error: ${error.message}`);
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.user.name} (${socket.userId})`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Handle note events
      this.handleNoteEvents(socket);
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleNoteEvents(socket) {
    // Open note for editing
    socket.on('note:open', async (data) => {
      try {
        const { noteId } = data;
        
        if (!noteId) {
          return socket.emit('note:error', { error: 'Note ID is required' });
        }

        // Verify note belongs to user
        const note = await Note.findOne({ _id: noteId, user: socket.userId });
        if (!note) {
          return socket.emit('note:error', { error: 'Note not found or access denied' });
        }

        // Track opened note
        const noteKey = `${socket.userId}-${noteId}`;
        this.openNotes.set(noteKey, {
          noteId,
          userId: socket.userId,
          openedAt: new Date(),
          lastActivity: new Date()
        });

        socket.emit('note:opened', {
          noteId,
          title: note.title,
          content: note.content,
          version: note.version,
          lastModified: note.lastModified
        });

        logger.info(`User ${socket.userId} opened note ${noteId}`);
      } catch (error) {
        logger.error(`Error opening note: ${error.message}`);
        socket.emit('note:error', { error: 'Failed to open note' });
      }
    });

    // Handle content changes (for auto-save timer)
    socket.on('note:content-change', (data) => {
      const { noteId, title, content } = data;
      
      if (!noteId) return;
      
      const noteKey = `${socket.userId}-${noteId}`;
      
      // Update last activity
      if (this.openNotes.has(noteKey)) {
        this.openNotes.get(noteKey).lastActivity = new Date();
      }
      
      // Setup auto-save (will save after 5 seconds of inactivity)
      this.setupAutoSave(noteId, socket.userId, { title, content });
    });

    // Handle manual save
    socket.on('note:save', async (data) => {
      try {
        const { noteId, title, content, createVersion = false } = data;
        
        // Clear existing auto-save timer
        this.clearAutoSave(noteId, socket.userId);
        
        // Save the note
        const result = await this.saveNote(noteId, socket.userId, { title, content }, createVersion);
        
        // Emit save confirmation to user
        socket.emit('note:saved', {
          noteId,
          success: true,
          lastSaved: new Date(),
          version: result.note.version,
          versionCreated: result.versionCreated
        });
        
      } catch (error) {
        logger.error(`Error saving note ${data.noteId}: ${error.message}`);
        socket.emit('note:save-error', {
          noteId: data.noteId,
          error: error.message
        });
      }
    });

    // Handle note close (IMPORTANT: Auto-save and create version)
    socket.on('note:close', async (data) => {
      try {
        const { noteId, title, content, hasUnsavedChanges = false } = data;
        
        // Clear auto-save timer
        this.clearAutoSave(noteId, socket.userId);
        
        // Save if there are unsaved changes and create version
        if (hasUnsavedChanges) {
          const result = await this.saveNote(noteId, socket.userId, { title, content }, true, 'close-save');
          
          socket.emit('note:closed', {
            noteId,
            saved: true,
            version: result.note.version,
            versionCreated: true
          });
        } else {
          socket.emit('note:closed', {
            noteId,
            saved: false
          });
        }

        // Remove from open notes
        const noteKey = `${socket.userId}-${noteId}`;
        this.openNotes.delete(noteKey);
        
        logger.info(`User ${socket.userId} closed note ${noteId}`);
      } catch (error) {
        logger.error(`Error closing note ${data.noteId}: ${error.message}`);
        socket.emit('note:close-error', {
          noteId: data.noteId,
          error: error.message
        });
      }
    });

    // Get version history
    socket.on('note:get-versions', async (data) => {
      try {
        const { noteId, limit = 10, skip = 0 } = data;
        
        // Verify note belongs to user
        const note = await Note.findOne({ _id: noteId, user: socket.userId });
        if (!note) {
          return socket.emit('note:error', { error: 'Note not found or access denied' });
        }

        const versions = await NoteVersion.find({ note: noteId })
          .sort({ version: -1 })
          .limit(limit)
          .skip(skip)
          .populate('user', 'name email');

        socket.emit('note:versions', {
          noteId,
          versions,
          total: await NoteVersion.countDocuments({ note: noteId })
        });
      } catch (error) {
        logger.error(`Error getting versions for note ${data.noteId}: ${error.message}`);
        socket.emit('note:error', { error: 'Failed to get versions' });
      }
    });

    // Restore from version
    socket.on('note:restore-version', async (data) => {
      try {
        const { noteId, versionId } = data;
        
        // Verify note belongs to user
        const note = await Note.findOne({ _id: noteId, user: socket.userId });
        if (!note) {
          return socket.emit('note:error', { error: 'Note not found or access denied' });
        }

        const version = await NoteVersion.findOne({ _id: versionId, note: noteId });
        if (!version) {
          return socket.emit('note:error', { error: 'Version not found' });
        }

        // Restore note from version
        const restoredNote = await version.restoreToNote();
        
        // Create a new version for the restore action
        await NoteVersion.createFromNote(restoredNote, 'edit', `Restored from version ${version.version}`);

        socket.emit('note:restored', {
          noteId,
          title: restoredNote.title,
          content: restoredNote.content,
          version: restoredNote.version,
          restoredFromVersion: version.version
        });

        logger.info(`User ${socket.userId} restored note ${noteId} from version ${version.version}`);
      } catch (error) {
        logger.error(`Error restoring note version: ${error.message}`);
        socket.emit('note:error', { error: 'Failed to restore version' });
      }
    });
  }

  setupAutoSave(noteId, userId, data) {
    const key = `${userId}-${noteId}`;
    
    // Clear existing timer
    this.clearAutoSave(noteId, userId);
    
    // Set new auto-save timer (5 seconds)
    const timerId = setTimeout(async () => {
      try {
        await this.saveNote(noteId, userId, data, false, 'auto-save');
        
        // Emit auto-save confirmation
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
          this.io.to(socketId).emit('note:auto-saved', {
            noteId,
            lastSaved: new Date()
          });
        }
        
        // Clean up timer
        this.autoSaveTimers.delete(key);
        
      } catch (error) {
        logger.error(`Auto-save error for note ${noteId}, user ${userId}: ${error.message}`);
        
        // Emit error to user
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
          this.io.to(socketId).emit('note:auto-save-error', {
            noteId,
            error: error.message
          });
        }
      }
    }, 5000); // 5 seconds delay
    
    this.autoSaveTimers.set(key, timerId);
  }

  clearAutoSave(noteId, userId) {
    const key = `${userId}-${noteId}`;
    const timerId = this.autoSaveTimers.get(key);
    
    if (timerId) {
      clearTimeout(timerId);
      this.autoSaveTimers.delete(key);
    }
  }

  async saveNote(noteId, userId, data, createVersion = false, changeType = 'edit') {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, user: userId },
      {
        ...data,
        lastModified: new Date(),
        lastAutoSave: changeType === 'auto-save' ? new Date() : undefined
      },
      { new: true, runValidators: true }
    );
    
    if (!note) {
      throw new Error('Note not found or access denied');
    }

    let versionCreated = false;
    
    // Create version if requested or if it's a manual save/close
    if (createVersion || ['manual-save', 'close-save'].includes(changeType)) {
      await NoteVersion.createFromNote(note, changeType, `${changeType.replace('-', ' ')} - Version ${note.version}`);
      versionCreated = true;
    }
    
    return { note, versionCreated };
  }

  handleDisconnect(socket) {
    logger.info(`User disconnected: ${socket.user.name} (${socket.userId})`);
    
    // Remove user from connected users
    this.connectedUsers.delete(socket.userId);
    
    // Clear auto-save timers for this user
    for (const [key, timerId] of this.autoSaveTimers.entries()) {
      if (key.startsWith(socket.userId + '-')) {
        clearTimeout(timerId);
        this.autoSaveTimers.delete(key);
      }
    }
    
    // Remove open notes for this user
    for (const [key, noteData] of this.openNotes.entries()) {
      if (noteData.userId === socket.userId) {
        this.openNotes.delete(key);
      }
    }
  }

  // Utility methods
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  getUserOpenNotes(userId) {
    const userNotes = [];
    for (const [key, noteData] of this.openNotes.entries()) {
      if (noteData.userId === userId) {
        userNotes.push(noteData);
      }
    }
    return userNotes;
  }
}

module.exports = new SocketService();
