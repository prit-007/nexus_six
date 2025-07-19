import React, { useState, useEffect } from 'react';
import { LogOut, Plus, MoreVertical, Lock, Trash2, BookOpen, User, FileText, Building, Home, Cloud, Settings, Briefcase, Calendar, Beaker, FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Update the journals state initialization to load from localStorage
  const [journals, setJournals] = useState(() => {
    const savedJournals = localStorage.getItem('journals');
    if (savedJournals) {
      return JSON.parse(savedJournals);
    }
    return []; // Start with empty array instead of static data
  });

  // Add useEffect to save to localStorage whenever journals change
  useEffect(() => {
    localStorage.setItem('journals', JSON.stringify(journals));
  }, [journals]);

  const updateJournal = (id, updates) => {
    setJournals(prev => {
      const updated = prev.map(journal => 
        journal.id === parseInt(id) ? { ...journal, ...updates } : journal
      );
      return updated;
    });
  };

  const [newJournal, setNewJournal] = useState({
    title: '',
    description: '',
    color: '#3B82F6',
    icon: 'BookOpen',
    hasPassword: false,
    password: ''
  });

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#A855F7'  // Purple
  ];

  const iconComponents = {
    BookOpen, User, FileText, Building, Home, Cloud, Settings, Briefcase, Calendar, Beaker, FlaskConical, Lock
  };

  const icons = ['BookOpen', 'User', 'FileText', 'Building', 'Home', 'Cloud', 'Settings', 'Briefcase', 'Calendar', 'Beaker', 'FlaskConical', 'Lock'];

  const handleJournalClick = (journal) => {
    if (journal.hasPassword) {
      setSelectedJournal(journal);
      setShowPasswordDialog(true);
      setEnteredPassword('');
      setPasswordError('');
    } else {
      // Navigate to note page
      navigate(`/note/${journal.id}`);
    }
  };

  const handlePasswordSubmit = () => {
    if (enteredPassword === selectedJournal.password) {
      setShowPasswordDialog(false);
      navigate(`/note/${selectedJournal.id}`);
    } else {
      setPasswordError('Invalid password');
    }
  };

  const handleDeleteClick = (e, journal) => {
    e.stopPropagation();
    setSelectedJournal(journal);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    setJournals(journals.filter(j => j.id !== selectedJournal.id));
    setShowDeleteDialog(false);
    setSelectedJournal(null);
  };

  const handleCreateJournal = () => {
    if (newJournal.title.trim()) {
      const journal = {
        id: Date.now(),
        title: newJournal.title,
        description: newJournal.description,
        color: newJournal.color,
        icon: newJournal.icon,
        hasPassword: newJournal.hasPassword,
        password: newJournal.password,
        content: '' // Add content field
      };
      setJournals([...journals, journal]);
      setNewJournal({
        title: '',
        description: '',
        color: '#3B82F6',
        icon: 'BookOpen',
        hasPassword: false,
        password: ''
      });
      setShowCreateModal(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('journals'); // Optional: clear journals on logout
    navigate('/auth');
  };

  const renderIcon = (iconName, className = "w-8 h-8") => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent className={className} /> : <BookOpen className={className} />;
  };

  React.useEffect(() => {
    // Make updateJournal available globally for NotePage
    window.updateJournal = updateJournal;
    window.getJournal = (id) => journals.find(j => j.id === parseInt(id));
  }, [journals]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-white">Journals</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Journal</span>
          </button>
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Journals Grid */}
      <div className="px-6 pb-6">
        {journals.length === 0 ? (
          // Empty state encouragement
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-white mb-4">Start Your Journey</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Create your first journal to begin capturing your thoughts, ideas, and memories. 
                Your digital notebook awaits!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Journal</span>
              </button>
            </div>
          </div>
        ) : (
          // Existing journals grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {journals.map((journal) => (
              <div
                key={journal.id}
                onClick={() => handleJournalClick(journal)}
                className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-xl border border-white border-opacity-20 overflow-hidden hover:transform hover:scale-105 transition-all duration-200 cursor-pointer group"
              >
                <div 
                  className="h-32 flex items-center justify-center relative"
                  style={{ backgroundColor: journal.color }}
                >
                  {renderIcon(journal.icon, "w-12 h-12 text-white")}
                  {journal.hasPassword && (
                    <Lock className="absolute top-3 left-3 w-4 h-4 text-white" />
                  )}
                  <button 
                    onClick={(e) => handleDeleteClick(e, journal)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-black hover:bg-opacity-20 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-white hover:text-red-300" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold truncate">{journal.title}</h3>
                  {journal.description && (
                    <p className="text-gray-300 text-sm mt-1 truncate">{journal.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-purple-500 p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Enter Password</h2>
              <p className="text-gray-300">This journal is password protected</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => {
                  setEnteredPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password..."
                className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-400"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm">{passwordError}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-red-500 p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Delete Journal</h2>
              <p className="text-gray-300">Are you sure you want to delete "{selectedJournal?.title}"?</p>
              <p className="text-red-400 text-sm mt-2">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Journal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-purple-500 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Create a New Journal</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Journal Name:</label>
                <input
                  type="text"
                  value={newJournal.title}
                  onChange={(e) => setNewJournal({...newJournal, title: e.target.value})}
                  placeholder="Enter a name..."
                  className="w-full bg-slate-700 text-white border-b-2 border-purple-500 px-3 py-2 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Description:</label>
                <textarea
                  value={newJournal.description}
                  onChange={(e) => setNewJournal({...newJournal, description: e.target.value})}
                  placeholder="Enter description..."
                  className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Colour</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewJournal({...newJournal, color})}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newJournal.color === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {icons.map((iconName) => (
                    <button
                      key={iconName}
                      onClick={() => setNewJournal({...newJournal, icon: iconName})}
                      className={`w-10 h-10 border-2 rounded flex items-center justify-center ${
                        newJournal.icon === iconName ? 'border-purple-500 bg-purple-600' : 'border-slate-600 bg-slate-700'
                      }`}
                    >
                      {renderIcon(iconName, "w-5 h-5 text-white")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasPassword"
                  checked={newJournal.hasPassword}
                  onChange={(e) => setNewJournal({...newJournal, hasPassword: e.target.checked})}
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="hasPassword" className="text-white">Password protect this journal</label>
              </div>

              {newJournal.hasPassword && (
                <div>
                  <input
                    type="password"
                    value={newJournal.password}
                    onChange={(e) => setNewJournal({...newJournal, password: e.target.value})}
                    placeholder="Enter password..."
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJournal}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-red-500 p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Logout</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






