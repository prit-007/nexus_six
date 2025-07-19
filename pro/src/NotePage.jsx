import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

export default function NotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const initialLoadRef = useRef(false);

  // Load journal data on component mount
  useEffect(() => {
    if (window.getJournal) {
      const journal = window.getJournal(id);
      if (journal) {
        setTitle(journal.title);
        setContent(journal.content || '');
        setLastSaved(new Date());
        initialLoadRef.current = true;
      }
    }
  }, [id]);

  // Auto-save functionality
  useEffect(() => {
    if (!initialLoadRef.current) return; // Don't auto-save on initial load
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setHasUnsavedChanges(true);

    // Auto-save after 2 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, title]);

  // Save before leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        handleAutoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save when component unmounts
      if (hasUnsavedChanges) {
        handleAutoSave();
      }
    };
  }, [hasUnsavedChanges, content, title]);

  const handleAutoSave = () => {
    if (window.updateJournal) {
      window.updateJournal(id, {
        title: title || `Note ${id}`,
        content: content
      });
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log('Auto-saved note:', { id, title, content });
    }
  };

  const handleManualSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    handleAutoSave();
  };

  const handleBack = () => {
    // Save before navigating back
    if (hasUnsavedChanges) {
      handleAutoSave();
    }
    navigate('/'); // Navigate to root instead of /dashboard
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-white border-opacity-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="text-white hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-2xl font-bold text-white bg-transparent border-none outline-none"
            placeholder="Note title..."
          />
        </div>
        <div className="flex items-center space-x-4">
          {/* Save status indicator */}
          <div className="text-sm text-gray-300">
            {hasUnsavedChanges ? (
              <span className="text-yellow-400">● Unsaved changes</span>
            ) : lastSaved ? (
              <span className="text-green-400">✓ Saved {lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>
          <button
            onClick={handleManualSave}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your note..."
          className="w-full h-96 bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl border border-white border-opacity-20 text-white p-6 resize-none focus:outline-none focus:border-purple-400 placeholder-gray-400"
        />
      </div>
    </div>
  );
}

