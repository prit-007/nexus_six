import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentNoteId = null;
    this.autoSaveCallbacks = new Map();
    this.eventCallbacks = new Map();
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:1969';
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
    return this.socket;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket.IO connected');
      this.isConnected = true;
      this.triggerCallback('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      this.isConnected = false;
      this.triggerCallback('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.triggerCallback('error', error);
    });

    // Note-specific events
    this.socket.on('note:opened', (data) => {
      console.log('Note opened:', data);
      this.triggerCallback('note:opened', data);
    });

    this.socket.on('note:saved', (data) => {
      console.log('Note saved:', data);
      this.triggerCallback('note:saved', data);
    });

    this.socket.on('note:auto-saved', (data) => {
      console.log('Note auto-saved:', data);
      this.triggerCallback('note:auto-saved', data);
    });

    this.socket.on('note:save-error', (data) => {
      console.error('Note save error:', data);
      this.triggerCallback('note:save-error', data);
    });

    this.socket.on('note:auto-save-error', (data) => {
      console.error('Note auto-save error:', data);
      this.triggerCallback('note:auto-save-error', data);
    });

    this.socket.on('note:closed', (data) => {
      console.log('Note closed:', data);
      this.triggerCallback('note:closed', data);
    });

    this.socket.on('note:error', (data) => {
      console.error('Note error:', data);
      this.triggerCallback('note:error', data);
    });
  }

  // Open a note for editing
  openNote(noteId) {
    if (!this.isConnected || !noteId) return;
    
    this.currentNoteId = noteId;
    this.socket.emit('note:open', { noteId });
  }

  // Send content changes (triggers auto-save timer on server)
  sendContentChange(noteId, title, content) {
    if (!this.isConnected || !noteId) return;
    
    this.socket.emit('note:content-change', {
      noteId,
      title,
      content
    });
  }

  // Manual save
  saveNote(noteId, title, content, createVersion = false) {
    if (!this.isConnected || !noteId) return;
    
    this.socket.emit('note:save', {
      noteId,
      title,
      content,
      createVersion
    });
  }

  // Close note (auto-saves if there are unsaved changes)
  closeNote(noteId, title, content, hasUnsavedChanges = false) {
    if (!this.isConnected || !noteId) return;
    
    this.socket.emit('note:close', {
      noteId,
      title,
      content,
      hasUnsavedChanges
    });
    
    this.currentNoteId = null;
  }

  // Get version history
  getVersions(noteId, limit = 10, skip = 0) {
    if (!this.isConnected || !noteId) return;
    
    this.socket.emit('note:get-versions', {
      noteId,
      limit,
      skip
    });
  }

  // Restore to version
  restoreVersion(noteId, versionId) {
    if (!this.isConnected || !noteId || !versionId) return;
    
    this.socket.emit('note:restore-version', {
      noteId,
      versionId
    });
  }

  // Event callback management
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventCallbacks.has(event)) {
      const callbacks = this.eventCallbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  triggerCallback(event, data) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket callback for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      // Close current note if any
      if (this.currentNoteId) {
        this.closeNote(this.currentNoteId, '', '', false);
      }
      
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentNoteId = null;
      this.eventCallbacks.clear();
    }
  }

  // Utility methods
  isNoteOpen(noteId) {
    return this.currentNoteId === noteId;
  }

  getCurrentNoteId() {
    return this.currentNoteId;
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;
