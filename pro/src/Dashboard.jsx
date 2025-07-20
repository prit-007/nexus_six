import { useState, useEffect, useCallback } from 'react';
import { LogOut, Plus, Lock, Trash2, BookOpen, User, FileText, Building, Home, Cloud, Settings, Briefcase, Calendar, Beaker, FlaskConical } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJournal, setNewJournal] = useState({
    title: '',
    description: '',
    color: '#3B82F6',
    icon: 'BookOpen',
    hasPassword: false,
    password: ''
  });

  // Define fetchUserData with useCallback to prevent re-creation on every render
  const fetchUserData = useCallback(async (token) => {
    try {
      const response = await axios.get('http://localhost:1969/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // If token is invalid, redirect to auth
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/auth');
      }
    }
  }, [navigate]);

  // Define fetchJournals with useCallback
  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch both groups and individual notes
      const [groupsResponse, notesResponse] = await Promise.all([
        axios.get('http://localhost:1969/api/groups', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:1969/api/notes', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      let allJournals = [];

      // Transform groups to journal format
      if (groupsResponse.data.success) {
        const transformedGroups = groupsResponse.data.data.map(group => {
          // Parse password from description if exists
          let description = group.description || '';
          let password = '';
          let hasPassword = false;

          if (description.includes('||PASSWORD:')) {
            const parts = description.split('||PASSWORD:');
            description = parts[0];
            password = parts[1];
            hasPassword = true;
          }

          return {
            id: group._id,
            title: group.name,
            description: description,
            color: group.color,
            icon: group.icon,
            hasPassword: hasPassword,
            password: password,
            content: '',
            type: 'group',
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
          };
        });
        allJournals.push(...transformedGroups);
      }

      // Transform individual notes to journal format
      if (notesResponse.data.success) {
        const transformedNotes = notesResponse.data.data
          .filter(note => !note.group) // Only notes that are not in a group
          .map(note => ({
            id: note._id,
            title: note.title,
            description: note.content ? note.content.substring(0, 100) + '...' : '',
            color: '#6366F1', // Default color for individual notes
            icon: 'FileText',
            hasPassword: note.isProtected,
            password: '', // Password verification will be handled by API
            content: note.content,
            type: 'note',
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          }));
        allJournals.push(...transformedNotes);
      }

      // Sort by creation date (newest first)
      allJournals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setJournals(allJournals);

    } catch (error) {
      console.error('Error fetching journals and notes:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // First useEffect for URL parameters and initial setup
  useEffect(() => {
    // Check for email verification success
    const verified = searchParams.get('verified');
    const token = searchParams.get('token');

    if (verified === 'true' && token) {
      // Store the token and show success message
      localStorage.setItem('token', token);
      setShowWelcome(true);

      // Clean up URL parameters
      navigate('/', { replace: true });
    }

    // Check for verification errors
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = 'Verification failed';
      if (error === 'expired') {
        errorMessage = 'Verification link has expired. Please request a new one.';
      } else if (error === 'invalid') {
        errorMessage = 'Invalid verification link.';
      } else if (error === 'server') {
        errorMessage = 'Server error during verification.';
      }

      alert(errorMessage);
      navigate('/auth', { replace: true });
    }

    // Fetch user data if token exists
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      fetchUserData(storedToken);
      fetchJournals(); // Fetch journals when user is authenticated
    }
  }, [searchParams, navigate, fetchUserData, fetchJournals]);

  // Second useEffect for fetching journals when component mounts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchJournals();
    }
  }, [fetchJournals]);

  // API functions for journals (groups) and notes
  const createJournalAPI = async (journalData) => {
    try {
      const token = localStorage.getItem('token');

      // Prepare description with password info if needed
      let description = journalData.description;
      if (journalData.hasPassword && journalData.password) {
        // Store password info in a special format (not secure, for demo only)
        description = `${journalData.description}||PASSWORD:${journalData.password}`;
      }

      const response = await axios.post('http://localhost:1969/api/groups', {
        name: journalData.title,
        description: description,
        color: journalData.color,
        icon: journalData.icon
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const newJournal = {
          id: response.data.data._id,
          title: response.data.data.name,
          description: journalData.description, // Store original description without password
          color: response.data.data.color,
          icon: response.data.data.icon,
          hasPassword: journalData.hasPassword,
          password: journalData.password,
          content: '',
          createdAt: response.data.data.createdAt,
          updatedAt: response.data.data.updatedAt
        };
        setJournals(prev => [newJournal, ...prev]);
        return newJournal;
      }
    } catch (error) {
      console.error('Error creating journal:', error);
      throw error;
    }
  };

  const deleteJournalAPI = async (journal) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = journal.type === 'note'
        ? `http://localhost:1969/api/notes/${journal.id}`
        : `http://localhost:1969/api/groups/${journal.id}`;

      await axios.delete(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setJournals(prev => prev.filter(j => j.id !== journal.id));
    } catch (error) {
      console.error('Error deleting journal:', error);
      throw error;
    }
  };

  // Icon components mapping
  const iconComponents = {
    BookOpen, User, FileText, Building, Home, Cloud, Settings, 
    Briefcase, Calendar, Beaker, FlaskConical, Lock
  };

  const icons = ['BookOpen', 'User', 'FileText', 'Building', 'Home', 'Cloud', 'Settings', 'Briefcase', 'Calendar', 'Beaker', 'FlaskConical', 'Lock'];

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E', '#8B5A2B', '#6B7280', '#1F2937'
  ];

  const handleJournalClick = (journal) => {
    if (journal.hasPassword) {
      setSelectedJournal(journal);
      setShowPasswordDialog(true);
      setEnteredPassword('');
      setPasswordError('');
    } else {
      // Navigate based on type
      if (journal.type === 'note') {
        // For individual notes, navigate directly to the note
        navigate(`/${journal.id}`);
      } else {
        // For groups, navigate to notes filtered by group
        navigate(`/notes?group=${journal.id}`);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      if (selectedJournal.type === 'note') {
        // For notes, verify password via API
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(`http://localhost:1969/api/notes/${selectedJournal.id}`, {
            password: enteredPassword
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            setShowPasswordDialog(false);
            navigate(`/${selectedJournal.id}`);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            setPasswordError('Invalid password');
          } else {
            setPasswordError('Error verifying password');
          }
        }
      } else {
        // For groups, verify password on frontend (temporary solution)
        if (enteredPassword === selectedJournal.password) {
          setShowPasswordDialog(false);
          navigate(`/notes?group=${selectedJournal.id}`);
        } else {
          setPasswordError('Invalid password');
        }
      }
    } catch (error) {
      console.error('Password verification error:', error);
      setPasswordError('Error verifying password');
    }
  };

  const handleDeleteClick = (e, journal) => {
    e.stopPropagation();
    setSelectedJournal(journal);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteJournalAPI(selectedJournal);
      setShowDeleteDialog(false);
      setSelectedJournal(null);
    } catch (error) {
      console.error('Failed to delete journal:', error);
      alert('Failed to delete journal. Please try again.');
    }
  };

  const handleCreateJournal = async () => {
    if (newJournal.title.trim()) {
      try {
        await createJournalAPI(newJournal);
        setNewJournal({
          title: '',
          description: '',
          color: '#3B82F6',
          icon: 'BookOpen',
          hasPassword: false,
          password: ''
        });
        setShowCreateModal(false);
      } catch (error) {
        console.error('Failed to create journal:', error);
        alert('Failed to create journal. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setJournals([]); // Clear journals from state
    navigate('/auth');
  };

  const renderIcon = (iconName, className = "w-8 h-8") => {
    const IconComponent = iconComponents[iconName];
    return IconComponent ? <IconComponent className={className} /> : <BookOpen className={className} />;
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Welcome Message */}
      {user && (
        <div className="absolute top-4 left-4 z-10">
          <div className={`bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 transition-all duration-500 ${showWelcome ? 'animate-pulse bg-green-500/20 border border-green-400' : ''
            }`}>
            <p className="text-white font-semibold">
              Welcome, {user.username}!
              {showWelcome && <span className="text-green-400 ml-2">✓ Email Verified</span>}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img
              src="/notulate-logo.svg"
              alt="Notulate Logo"
              className="w-10 h-10 rounded-lg shadow-lg dashboard-logo"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">Notulate</h1>
              <p className="text-gray-300 text-sm">Smart note-taking with calculations</p>
            </div>
          </div>
        </div>
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
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-white text-lg">Loading journals...</div>
          </div>
        ) : journals.length === 0 ? (
          // Empty state encouragement
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-white mb-4">Start Your Journey</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Create your first journal to organize your notes, or start writing individual notes.
                Your digital workspace awaits!
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
                className={`bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-xl border border-white border-opacity-20 overflow-hidden hover:transform hover:scale-105 transition-all duration-200 cursor-pointer group ${journal.type === 'note' ? 'border-blue-400 border-opacity-30' : ''
                  }`}
              >
                <div
                  className="h-32 flex items-center justify-center relative"
                  style={{ backgroundColor: journal.color }}
                >
                  {renderIcon(journal.icon, "w-12 h-12 text-white")}
                  {journal.type === 'note' && (
                    <div className="absolute top-3 left-3 bg-blue-500 bg-opacity-80 rounded px-2 py-1 flex items-center gap-1">
                      {journal.hasPassword && <Lock className="w-3 h-3 text-white" />}
                      <span className="text-white text-xs font-semibold">NOTE</span>
                    </div>
                  )}
                  {journal.hasPassword && journal.type !== 'note' && (
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate flex-1">{journal.title}</h3>
                    {journal.type === 'note' && (
                      <span className="text-blue-300 text-xs bg-blue-500 bg-opacity-20 px-2 py-1 rounded">
                        Individual Note
                      </span>
                    )}
                  </div>
                  {journal.description && (
                    <p className="text-gray-300 text-sm mt-1 truncate">{journal.description}</p>
                  )}
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                    <span>{journal.type === 'note' ? 'Note' : 'Journal'}</span>
                    <span>{new Date(journal.updatedAt).toLocaleDateString()}</span>
                  </div>
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
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
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
                  onChange={(e) => setNewJournal({ ...newJournal, title: e.target.value })}
                  placeholder="Enter a name..."
                  className="w-full bg-slate-700 text-white border-b-2 border-purple-500 px-3 py-2 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Description:</label>
                <textarea
                  value={newJournal.description}
                  onChange={(e) => setNewJournal({ ...newJournal, description: e.target.value })}
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
                      onClick={() => setNewJournal({ ...newJournal, color })}
                      className={`w-8 h-8 rounded-full border-2 ${newJournal.color === color ? 'border-white' : 'border-transparent'
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
                      onClick={() => setNewJournal({ ...newJournal, icon: iconName })}
                      className={`w-10 h-10 border-2 rounded flex items-center justify-center ${newJournal.icon === iconName ? 'border-purple-500 bg-purple-600' : 'border-slate-600 bg-slate-700'
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
                  onChange={(e) => setNewJournal({ ...newJournal, hasPassword: e.target.checked })}
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="hasPassword" className="text-white">Password protect this journal</label>
              </div>

              {newJournal.hasPassword && (
                <div>
                  <input
                    type="password"
                    value={newJournal.password}
                    onChange={(e) => setNewJournal({ ...newJournal, password: e.target.value })}
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










