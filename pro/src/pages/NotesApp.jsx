import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import CalculationEngine from '../utils/calculationEngineEnhanced';
import socketService from '../services/socketService';
import {
  Calculator,
  Save,
  Plus,
  FileText,
  Trash2,
  Edit3,
  LogOut,
  User,
  Folder,
  Search,
  ArrowLeft,
  Star
} from 'lucide-react';
import './NotesApp.css';

const NotesApp = () => {
  const navigate = useNavigate();
  const { id: noteId } = useParams();
  const [searchParams] = useSearchParams();
  const journalId = searchParams.get('journal');

  // Core state with enhanced note data
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [activeNoteTitle, setActiveNoteTitle] = useState('Untitled Note');
  const [noteMetadata, setNoteMetadata] = useState({
    isProtected: false,
    isPublic: false,
    isArchived: false,
    isFavorite: false,
    tags: [],
    group: null,
    viewCount: 0,
    lastViewedAt: null,
    calculationEnabled: true,
    decimalPrecision: 2,
    currencySymbol: '$'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Create dialog state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    isProtected: false,
    password: ''
  });

  // Calculation state
  const [calculationResults, setCalculationResults] = useState({});
  const [variables, setVariables] = useState({});
  const [processingStats, setProcessingStats] = useState({
    lines: 0,
    variables: 0,
    calculations: 0,
    processingTime: 0
  });

  // Auto-replacement state
  const [expressionHistory, setExpressionHistory] = useState(new Map());
  const [isAutoReplacing, setIsAutoReplacing] = useState(false);

  // Add undo/redo state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  // Refs
  const textareaRef = useRef(null);
  const calculationEngine = useRef(new CalculationEngine());
  const processingTimeoutRef = useRef(null);
  const titleInputRef = useRef(null);

  // Add API functions BEFORE the useEffect that uses them
  const fetchNotesFromAPI = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:1969/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched notes:', data.data);
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }, []);

  const fetchNoteById = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:1969/api/notes/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching note:', error);
      return null;
    }
  }, []);

  const saveNoteToAPI = useCallback(async (noteData) => {
    console.log('saveNoteToAPI called with:', noteData);
    if (!autoSaveEnabled && !noteData.forceUpdate) {
      console.log('Auto-save disabled and not forced, returning');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      const url = noteData.id ?
        `http://localhost:1969/api/notes/${noteData.id}` :
        'http://localhost:1969/api/notes';

      const method = noteData.id ? 'PUT' : 'POST';
      console.log('API call:', method, url);

      const payload = {
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        variables: variables || {},
        lastCalculationResult: calculationResults || {},
        metadata: {
          calculationEnabled: noteData.calculationEnabled ?? noteMetadata.calculationEnabled ?? true,
          decimalPrecision: noteData.decimalPrecision ?? noteMetadata.decimalPrecision ?? 2,
          currencySymbol: noteData.currencySymbol ?? noteMetadata.currencySymbol ?? '$',
          lineReferencingEnabled: true,
          autoCalculate: true
        },
        isProtected: noteData.isProtected ?? noteMetadata.isProtected ?? false,
        isPublic: noteData.isPublic ?? noteMetadata.isPublic ?? false,
        isArchived: noteData.isArchived ?? noteMetadata.isArchived ?? false,
        isFavorite: noteData.isFavorite ?? noteMetadata.isFavorite ?? false,
        tags: noteData.tags ?? noteMetadata.tags ?? [],
        group: noteData.group ?? noteMetadata.group ?? null
      };

      // Add password to payload if note is protected
      if (noteData.isProtected && noteData.password) {
        payload.password = noteData.password;
      }

      // Add group/journal if specified
      if (journalId) {
        payload.group = journalId;
      }

      console.log('Final payload being sent:', payload);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setLastSaved(new Date());

        // Update local note data
        if (method === 'POST') {
          setActiveNote(data.data._id);
          // Update URL to reflect new note ID
          navigate(`/notes/${data.data._id}`, { replace: true });
        }

        return data.data;
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [autoSaveEnabled, variables, calculationResults, noteMetadata, journalId, navigate]);

  // Load specific note or notes list
  useEffect(() => {
    const loadData = async () => {
      // Always load all notes first
      const allNotes = await fetchNotesFromAPI();
      setNotes(allNotes);

      if (noteId) {
        // Load specific note
        const note = await fetchNoteById(noteId);
        if (note) {
          setActiveNote(note._id);
          setActiveNoteTitle(note.title);
          setEditorContent(note.content || '');

          // Set metadata from note
          setNoteMetadata({
            isProtected: note.isProtected || false,
            isPublic: note.isPublic || false,
            isArchived: note.isArchived || false,
            isFavorite: note.isFavorite || false,
            tags: note.tags || [],
            group: note.group || null,
            viewCount: note.viewCount || 0,
            lastViewedAt: note.lastViewedAt,
            calculationEnabled: note.metadata?.calculationEnabled ?? true,
            decimalPrecision: note.metadata?.decimalPrecision ?? 2,
            currencySymbol: note.metadata?.currencySymbol ?? '$'
          });

          // Parse stored variables and calculation results
          if (note.variables) {
            setVariables(note.variables);
          }
          if (note.lastCalculationResult) {
            try {
              const results = JSON.parse(note.lastCalculationResult);
              setCalculationResults(results);
            } catch (e) {
              console.error('Error parsing calculation results:', e);
            }
          }
        } else {
          // Note not found, redirect to notes list
          navigate('/notes');
        }
      } else {
        // Load notes list view
        const filteredNotes = journalId ?
          allNotes.filter(note => note.journalId === journalId) :
          allNotes;

        if (filteredNotes.length > 0) {
          const firstNote = filteredNotes[0];
          setActiveNote(firstNote._id);
          setActiveNoteTitle(firstNote.title);
          setEditorContent(firstNote.content);

          // Set metadata
          setNoteMetadata({
            isProtected: firstNote.isProtected || false,
            isPublic: firstNote.isPublic || false,
            isArchived: firstNote.isArchived || false,
            isFavorite: firstNote.isFavorite || false,
            tags: firstNote.tags || [],
            group: firstNote.group || null,
            viewCount: firstNote.viewCount || 0,
            lastViewedAt: firstNote.lastViewedAt,
            calculationEnabled: firstNote.metadata?.calculationEnabled ?? true,
            decimalPrecision: firstNote.metadata?.decimalPrecision ?? 2,
            currencySymbol: firstNote.metadata?.currencySymbol ?? '$'
          });
        } else {
          // No notes available - show empty editor
          setActiveNote(null);
          setActiveNoteTitle('Untitled Note');
          setEditorContent('');
        }
      }
    };

    loadData();
  }, [noteId, journalId, fetchNoteById, fetchNotesFromAPI, navigate]);

  // Check authentication and initialize socket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    // Initialize Socket.IO connection
    socketService.connect(token);

    // Setup socket event handlers
    socketService.on('note:auto-saved', (data) => {
      console.log('Note auto-saved via socket:', data);
      setLastSaved(new Date(data.lastSaved));
      setIsSaving(false);
    });

    socketService.on('note:saved', (data) => {
      console.log('Note saved via socket:', data);
      setLastSaved(new Date(data.lastSaved));
      setIsSaving(false);
    });

    socketService.on('note:save-error', (data) => {
      console.error('Socket save error:', data);
      setIsSaving(false);
    });

    socketService.on('note:auto-save-error', (data) => {
      console.error('Socket auto-save error:', data);
      setIsSaving(false);
    });

    // Cleanup on unmount
    return () => {
      // Close current note if any
      if (activeNote) {
        socketService.closeNote(activeNote, activeNoteTitle, editorContent, false);
      }
      socketService.disconnect();
    };
  }, [navigate, activeNote, activeNoteTitle, editorContent]);

  // Save notes to localStorage
  const saveNotesToStorage = useCallback((notesToSave) => {
    localStorage.setItem('notes', JSON.stringify(notesToSave));
  }, []);

  // Process calculations
  const processCalculations = useCallback(async () => {
    if (!editorContent) {
      setCalculationResults({});
      setVariables({});
      setProcessingStats({ lines: 0, variables: 0, calculations: 0, processingTime: 0 });
      return;
    }

    try {
      const startTime = performance.now();
      const { results, variables: vars } = calculationEngine.current.processDocument(editorContent);
      const endTime = performance.now();

      setCalculationResults(results);
      setVariables(vars);

      const lines = editorContent.split('\n').filter(line => line.trim()).length;
      setProcessingStats({
        lines,
        variables: Object.keys(vars).length,
        calculations: Object.keys(results).length,
        processingTime: Math.round(endTime - startTime)
      });

    } catch (error) {
      console.error('Error processing calculations:', error);
    }
  }, [editorContent]);

  // Auto-replacement for mathematical expressions
  const handleAutoReplacement = useCallback((triggerType = 'equals') => {
    const textarea = textareaRef.current;
    if (!textarea || isAutoReplacing) return;

    try {
      setIsAutoReplacing(true);

      const cursorPosition = textarea.selectionStart;
      const text = textarea.value;
      const lines = text.split('\n');

      // Find current line
      let currentLineIndex = 0;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= cursorPosition) {
          currentLineIndex = i;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline
      }

      // For Enter key, check previous line
      if (triggerType === 'enter' && currentLineIndex > 0) {
        currentLineIndex = currentLineIndex - 1;
      }

      const currentLine = lines[currentLineIndex];
      if (!currentLine || !currentLine.trim()) {
        setIsAutoReplacing(false);
        return;
      }

      // Enhanced expression patterns - more specific and ordered
      const patterns = [
        /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/, // Variable assignment (like "x = 10") - FIRST priority
        /^(.+?)\s*=\s*$/, // Expression ending with = (like "2+3=" or "x+y=")
        /^(.+?)\s*=\s*(.+)$/, // Expression with = and existing result - check if we need to recalculate
        /^([^=]+)$/, // Any expression without = sign (for Enter key) - captures full line
      ];

      let expressionMatch = null;
      let expression = '';
      let isVariableAssignment = false;

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = currentLine.match(pattern);
        if (match) {
          console.log(`Pattern ${i} matched:`, match);

          if (i === 0) { // Variable assignment pattern "x = 10"
            isVariableAssignment = true;
            const varName = match[1].trim();
            expression = match[2].trim();
            console.log(`Variable assignment detected: ${varName} = ${expression}`);
          } else if (i === 1) { // Expression ending with = "2+3="
            expression = match[1].trim();
            console.log(`Expression ending with = detected: ${expression}`);
          } else if (i === 2) { // Expression with = and result "2+3 = 5"
            const leftSide = match[1].trim();
            const rightSide = match[2].trim();

            // Check if right side is already a number (result exists)
            if (rightSide && !isNaN(parseFloat(rightSide)) && isFinite(parseFloat(rightSide))) {
              // Already has a result, skip unless it's wrong
              console.log(`Expression already has result: ${leftSide} = ${rightSide}`);

              // Verify if the result is correct
              try {
                const correctResult = calculationEngine.current.evaluate(leftSide, {
                  ...variables,
                  lineResults: calculationResults
                });

                if (Math.abs(parseFloat(rightSide) - parseFloat(correctResult)) > 0.0001) {
                  // Result is wrong, recalculate
                  expression = leftSide;
                  console.log(`Incorrect result detected, recalculating: ${leftSide}`);
                } else {
                  // Result is correct, skip
                  setIsAutoReplacing(false);
                  return;
                }
              } catch (err) {
                setIsAutoReplacing(false);
                return;
              }
            } else {
              expression = leftSide;
              console.log(`Expression with empty result detected: ${expression}`);
            }
          } else if (i === 3) { // Any expression without = (for Enter key)
            expression = match[1].trim();
            console.log(`Expression without = detected: ${expression}`);
          }

          expressionMatch = match;
          break;
        }
      }

      if (expression && expressionMatch) {
        console.log(`Processing expression: "${expression}", isVariableAssignment: ${isVariableAssignment}`);

        // For variable assignments, we always calculate
        // For regular expressions, check if they contain math operators or functions
        const hasMathOperators = /[+\-*/^%()]/.test(expression);
        const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(expression);
        const hasFunctions = /\b(sum|avg|average|min|max|round|sqrt|pow|abs|floor|ceil|sin|cos|tan|log|ln)\s*\(/i.test(expression);
        const isNumber = !isNaN(parseFloat(expression)) && isFinite(parseFloat(expression)) && expression.trim() === parseFloat(expression).toString();

        console.log(`hasMathOperators: ${hasMathOperators}, hasVariables: ${hasVariables}, hasFunctions: ${hasFunctions}, isNumber: ${isNumber}`);

        // Skip if it's just a plain number (unless it's a variable assignment)
        if (isNumber && !isVariableAssignment) {
          console.log('Skipping: plain number without assignment');
          setIsAutoReplacing(false);
          return;
        }

        // Skip if no mathematical content
        if (!hasMathOperators && !hasVariables && !hasFunctions && !isVariableAssignment) {
          console.log('Skipping: no mathematical content');
          setIsAutoReplacing(false);
          return;
        }

        try {
          console.log(`Calling calculation engine with expression: "${expression}"`);
          console.log('Available variables:', variables);

          // Calculate result using the calculation engine
          const result = calculationEngine.current.evaluate(expression, {
            ...variables,
            lineResults: calculationResults
          });

          console.log(`Calculation result: "${result}"`);

          // Check if result is valid
          if (result !== '' && result !== undefined && result !== null) {
            const numericResult = parseFloat(result);
            if (!isNaN(numericResult) && isFinite(numericResult)) {
              console.log(`Valid numeric result: ${numericResult}`);

              // Store original for backspace
              const newHistory = new Map(expressionHistory);
              newHistory.set(currentLineIndex, {
                original: currentLine,
                calculated: numericResult.toString(),
                timestamp: Date.now()
              });
              setExpressionHistory(newHistory);

              // Replace line with result
              let resultText;
              if (isVariableAssignment) {
                const varName = expressionMatch[1].trim();
                resultText = `${varName} = ${numericResult}`;
                console.log(`Variable assignment result: ${resultText}`);
              } else {
                resultText = `${expression} = ${numericResult}`;
                console.log(`Expression result: ${resultText}`);
              }

              const newLines = [...lines];
              newLines[currentLineIndex] = resultText;
              const newContent = newLines.join('\n');

              setEditorContent(newContent);

              // Position cursor at end of modified line
              setTimeout(() => {
                const newCursorPos = newLines.slice(0, currentLineIndex).join('\n').length +
                  (currentLineIndex > 0 ? 1 : 0) + resultText.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                textarea.focus();
              }, 10);

              // Update calculations
              setTimeout(() => {
                processCalculations();
              }, 100);

              setIsAutoReplacing(false);
              return;
            }
          }
        } catch (calcError) {
          console.log('Calculation engine failed:', calcError);

          // Fallback: Try simple math evaluation for basic expressions
          try {
            console.log('Trying fallback calculation...');

            // Clean expression for fallback
            let cleanExp = expression.replace(/\s+/g, ' ').trim();

            // Substitute variables manually for fallback
            for (const [varName, varValue] of Object.entries(variables)) {
              const regex = new RegExp(`\\b${varName}\\b`, 'g');
              cleanExp = cleanExp.replace(regex, varValue.toString());
            }

            console.log(`Fallback expression after variable substitution: "${cleanExp}"`);

            // Only allow basic math characters for fallback
            if (/^[0-9+\-*/^%(). ]+$/.test(cleanExp)) {
              // Replace ^ with ** for JavaScript
              const jsExp = cleanExp.replace(/\^/g, '**');
              console.log(`JavaScript expression: "${jsExp}"`);

              const fallbackResult = new Function(`"use strict"; return (${jsExp})`)();
              console.log(`Fallback result: ${fallbackResult}`);

              if (typeof fallbackResult === 'number' && isFinite(fallbackResult)) {
                // Store original for backspace
                const newHistory = new Map(expressionHistory);
                newHistory.set(currentLineIndex, {
                  original: currentLine,
                  calculated: fallbackResult.toString(),
                  timestamp: Date.now()
                });
                setExpressionHistory(newHistory);

                let resultText;
                if (isVariableAssignment) {
                  const varName = expressionMatch[1].trim();
                  resultText = `${varName} = ${fallbackResult}`;
                } else {
                  resultText = `${expression} = ${fallbackResult}`;
                }

                const newLines = [...lines];
                newLines[currentLineIndex] = resultText;
                const newContent = newLines.join('\n');

                setEditorContent(newContent);

                setTimeout(() => {
                  const newCursorPos = newLines.slice(0, currentLineIndex).join('\n').length +
                    (currentLineIndex > 0 ? 1 : 0) + resultText.length;
                  textarea.setSelectionRange(newCursorPos, newCursorPos);
                  textarea.focus();
                }, 10);

                setTimeout(() => {
                  processCalculations();
                }, 100);

                setIsAutoReplacing(false);
                return;
              }
            }
          } catch (simpleError) {
            console.log('Fallback calculation also failed:', simpleError);
          }
        }

        console.log('No valid calculation result obtained');
      }
    } catch (error) {
      console.error('Auto-calculation error:', error);
    } finally {
      setIsAutoReplacing(false);
    }
  }, [variables, calculationResults, expressionHistory, isAutoReplacing, processCalculations]);

  // Handle backspace restoration
  const handleBackspaceRestore = useCallback((event) => {
    if (event.key === 'Backspace' && !isAutoReplacing) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const text = textarea.value;
      const lines = text.split('\n');

      // Find current line
      let currentLineIndex = 0;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= cursorPosition) {
          currentLineIndex = i;
          break;
        }
        charCount += lines[i].length + 1;
      }

      const historyEntry = expressionHistory.get(currentLineIndex);
      const currentLine = lines[currentLineIndex];

      if (historyEntry && currentLine) {
        // Check if cursor is at end of calculated result
        const endOfLine = charCount + currentLine.length;
        if (cursorPosition === endOfLine) {
          event.preventDefault();
          setIsAutoReplacing(true);

          // Restore original expression
          const newLines = [...lines];
          newLines[currentLineIndex] = `${historyEntry.original}`;
          const newContent = newLines.join('\n');

          setEditorContent(newContent);

          // Remove from history
          const newHistory = new Map(expressionHistory);
          newHistory.delete(currentLineIndex);
          setExpressionHistory(newHistory);

          // Position cursor
          setTimeout(() => {
            const newCursorPos = newLines.slice(0, currentLineIndex).join('\n').length +
              (currentLineIndex > 0 ? 1 : 0) + newLines[currentLineIndex].length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
          }, 10);

          setIsAutoReplacing(false);
        }
      }
    }
  }, [expressionHistory, isAutoReplacing]);

  // Undo/Redo functions
  const saveToUndoStack = useCallback((content) => {
    if (isUndoRedo) return;

    setUndoStack(prev => {
      const newStack = [...prev, content];
      return newStack.slice(-50); // Keep last 50 states
    });
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [isUndoRedo]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    setIsUndoRedo(true);
    const previousContent = undoStack[undoStack.length - 1];

    setRedoStack(prev => [...prev, editorContent]);
    setUndoStack(prev => prev.slice(0, -1));
    setEditorContent(previousContent);

    setTimeout(() => setIsUndoRedo(false), 100);
  }, [undoStack, editorContent]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    setIsUndoRedo(true);
    const nextContent = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, editorContent]);
    setRedoStack(prev => prev.slice(0, -1));
    setEditorContent(nextContent);

    setTimeout(() => setIsUndoRedo(false), 100);
  }, [redoStack, editorContent]);

  // Key handling
  const handleKeyDown = useCallback((event) => {
    // Undo/Redo shortcuts
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if ((event.key === 'y') || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
        return;
      }
    }

    // Existing key handling for auto-replacement
    if (event.key === 'Enter') {
      setTimeout(() => {
        handleAutoReplacement('enter');
        // Move cursor to next line
        const textarea = textareaRef.current;
        if (textarea) {
          const cursorPosition = textarea.selectionStart;
          setTimeout(() => {
            textarea.setSelectionRange(cursorPosition, cursorPosition);
            textarea.focus();
          }, 50);
        }
      }, 10);
    } else if (event.key === '=') {
      setTimeout(() => {
        handleAutoReplacement('equals');
      }, 10);
    }

    handleBackspaceRestore(event);
  }, [handleAutoReplacement, handleBackspaceRestore, handleUndo, handleRedo]);

  // Content change handler
  const handleContentChange = useCallback((event) => {
    const value = event.target.value;

    // Save to undo stack before changing
    if (!isUndoRedo && editorContent !== value) {
      saveToUndoStack(editorContent);
    }

    setEditorContent(value);

    // Update local notes list
    if (activeNote) {
      const updatedNotes = notes.map(note =>
        (note.id || note._id) === activeNote
          ? { ...note, content: value, updatedAt: new Date().toISOString() }
          : note
      );
      setNotes(updatedNotes);
    }

    // Auto-save via Socket.IO if enabled
    if (autoSaveEnabled && activeNote) {
      setIsSaving(true);
      // Send content change to socket (triggers auto-save timer on server)
      socketService.sendContentChange(activeNote, activeNoteTitle, value);
    }

    // Debounced processing for calculations
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      processCalculations();
    }, 500);
  }, [activeNote, notes, autoSaveEnabled, activeNoteTitle, saveNoteToAPI, editorContent, isUndoRedo, saveToUndoStack, processCalculations]);

  // Handle create note from dialog
  const handleCreateNote = async () => {
    console.log('handleCreateNote called!');
    console.log('newNote state:', newNote);

    if (!newNote.title.trim()) {
      alert('Please enter a note title');
      return;
    }

    try {
      console.log('Creating new note from dialog...');
      const newNoteData = {
        title: newNote.title.trim(),
        content: newNote.content.trim(),
        isProtected: newNote.isProtected,
        password: newNote.password,
        forceUpdate: true,
        // Ensure we have default values for required fields
        metadata: {
          calculationEnabled: true,
          decimalPrecision: 2,
          currencySymbol: '$',
          lineReferencingEnabled: true,
          autoCalculate: true
        },
        variables: {},
        lastCalculationResult: {},
        tags: [],
        isPublic: false,
        isArchived: false,
        isFavorite: false
      };

      console.log('Calling saveNoteToAPI with:', newNoteData);
      const savedNote = await saveNoteToAPI(newNoteData);
      console.log('SaveNoteToAPI returned:', savedNote);

      if (savedNote) {
        console.log('Note saved successfully, updating UI...');
        // Clear editor and set new note as active
        setEditorContent(newNote.content);
        setActiveNoteTitle(newNote.title);
        setActiveNote(savedNote._id);

        // Add to notes list
        setNotes(prev => [savedNote, ...prev]);

        // Reset metadata for new note
        setNoteMetadata({
          isProtected: newNote.isProtected,
          isPublic: false,
          isArchived: false,
          isFavorite: false,
          tags: [],
          group: null,
          viewCount: 0,
          lastViewedAt: null,
          calculationEnabled: true,
          decimalPrecision: 2,
          currencySymbol: '$'
        });

        // Reset dialog state
        setNewNote({
          title: '',
          content: '',
          isProtected: false,
          password: ''
        });
        setShowCreateModal(false);

        // Navigate to new note
        navigate(`/${savedNote._id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note. Please try again.');
    }
  }


  // Enhanced updateNoteTitle
  const updateNoteTitle = async (newTitle) => {
    if (activeNote && newTitle.trim()) {
      setActiveNoteTitle(newTitle.trim());

      // Save via Socket.IO
      setIsSaving(true);
      socketService.saveNote(activeNote, newTitle.trim(), editorContent, false);

      // Update local notes list
      const updatedNotes = notes.map(note =>
        (note.id || note._id) === activeNote
          ? { ...note, title: newTitle.trim(), updatedAt: new Date().toISOString() }
          : note
      );
      setNotes(updatedNotes);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (event) => {
    if (event.key === 'Enter') {
      updateNoteTitle(event.target.value);
    } else if (event.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  // Filter notes based on search
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add line number calculation function
  const getLineNumbers = useCallback(() => {
    if (!showLineNumbers) return '';
    const lines = editorContent.split('\n');
    return lines.map((_, index) => index + 1).join('\n');
  }, [editorContent, showLineNumbers]);

  const selectNote = useCallback((selectedNoteId) => {
    if (noteId) {
      // If we're viewing a specific note, navigate to the selected one
      navigate(`/${selectedNoteId}`);
    } else {
      // If we're in notes list view, just switch active note
      const note = notes.find(n => (n.id || n._id) === selectedNoteId);
      if (note) {
        setActiveNote(selectedNoteId);
        setActiveNoteTitle(note.title);
        setEditorContent(note.content);

        // Set metadata from selected note
        setNoteMetadata({
          isProtected: note.isProtected || false,
          isPublic: note.isPublic || false,
          isArchived: note.isArchived || false,
          isFavorite: note.isFavorite || false,
          tags: note.tags || [],
          group: note.group || null,
          viewCount: note.viewCount || 0,
          lastViewedAt: note.lastViewedAt,
          calculationEnabled: note.metadata?.calculationEnabled ?? true,
          decimalPrecision: note.metadata?.decimalPrecision ?? 2,
          currencySymbol: note.metadata?.currencySymbol ?? '$'
        });

        // Parse stored variables and calculation results
        if (note.variables) {
          setVariables(note.variables);
        }
        if (note.lastCalculationResult) {
          try {
            const results = JSON.parse(note.lastCalculationResult);
            setCalculationResults(results);
          } catch (e) {
            console.error('Error parsing calculation results:', e);
          }
        }

        // Open note in socket for real-time features
        socketService.openNote(selectedNoteId);
      }
    }
  }, [noteId, notes, navigate]);

  // Delete note function - properly indented inside NotesApp component
  const deleteNote = useCallback(async (noteIdToDelete) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:1969/api/notes/${noteIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from local state
        const updatedNotes = notes.filter(note => (note.id || note._id) !== noteIdToDelete);
        setNotes(updatedNotes);

        // If we deleted the active note, switch to another one or clear editor
        if (activeNote === noteIdToDelete) {
          if (updatedNotes.length > 0) {
            const firstNote = updatedNotes[0];
            setActiveNote(firstNote._id || firstNote.id);
            setActiveNoteTitle(firstNote.title);
            setEditorContent(firstNote.content);

            // If we're viewing a specific note, navigate to the first available note
            if (noteId) {
              navigate(`/${firstNote._id || firstNote.id}`);
            }
          } else {
            // No notes left
            setActiveNote(null);
            setActiveNoteTitle('Untitled Note');
            setEditorContent('');

            // If we're viewing a specific note, navigate to notes list
            if (noteId) {
              navigate('/');
            }
          }
        }
      } else {
        console.error('Failed to delete note');
        alert('Failed to delete note. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note. Please try again.');
    }
  }, [notes, activeNote, noteId, navigate]);
  return (
    <div className="notes-app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="app-title">
            <Calculator size={24} />
            <span>Smart Notes</span>
          </div>
          <div className="header-actions">
            <button
              onClick={() => navigate('/dashboard')}
              className="back-btn"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <button onClick={logout} className="logout-btn">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
              />
              Line Numbers
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              />
              Auto Save
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={noteMetadata.isFavorite}
                onChange={(e) => setNoteMetadata(prev => ({ ...prev, isFavorite: e.target.checked }))}
              />
              Favorite
            </label>
          </div>

          {/* Undo/Redo buttons */}
          <div className="undo-redo-controls">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="undo-btn"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="redo-btn"
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>
          </div>

          <div className="save-controls">
            <button
              onClick={() => {
                if (activeNote) {
                  setIsSaving(true);
                  socketService.saveNote(activeNote, activeNoteTitle, editorContent, true);
                }
              }}
              className="save-btn"
              disabled={isSaving}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {lastSaved && (
              <div className="last-saved">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Search and New Note */}
        <div className="search-section">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              console.log('New Note button clicked!');
              setShowCreateModal(true);
            }}
            className="new-note-btn"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>

        {/* Notes List */}
        <div className="notes-list">
          {filteredNotes.map(note => (
            <div
              key={note._id || note.id}
              className={`note-item ${activeNote === (note._id || note.id) ? 'active' : ''}`}
              onClick={() => selectNote(note._id || note.id)}
            >
              <div className="note-header">
                <FileText size={16} />
                <span className="note-title">{note.title}</span>
                {note.isFavorite && <Star size={12} className="favorite-icon" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note._id || note.id);
                  }}
                  className="delete-btn"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="note-preview">
                {note.content.slice(0, 50)}...
              </div>
              <div className="note-meta">
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                <span>{note.viewCount || 0} views</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="main-editor">
        {activeNote ? (
          <>
            {/* Editor Header */}
            <div className="editor-header">
              <div className="title-section">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    className="title-input"
                    defaultValue={activeNoteTitle}
                    onBlur={(e) => updateNoteTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                  />
                ) : (
                  <h1
                    className="note-title"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {activeNoteTitle}
                    <Edit3 size={16} className="edit-icon" />
                  </h1>
                )}
              </div>

              {/* Stats */}
              <div className="stats-bar">
                <div className="stat-item">
                  <span className="stat-label">Lines:</span>
                  <span className="stat-value">{processingStats.lines}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Variables:</span>
                  <span className="stat-value">{processingStats.variables}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Calculations:</span>
                  <span className="stat-value">{processingStats.calculations}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Processing:</span>
                  <span className="stat-value">{processingStats.processingTime}ms</span>
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="editor-content">
              <div className="editor-container">
                {showLineNumbers && (
                  <div className="line-numbers">
                    <pre>{getLineNumbers()}</pre>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={editorContent}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Start typing your notes with mathematical expressions...

Examples:
x = 10
y = 20
sum = x + y
area = 3.14 * 5^2

Built-in Functions:
sum(1, 2, 3, 4, 5)
avg(10, 20, 30)
min(5, 3, 8, 1)
max(2, 7, 4, 9)

Press Enter or = for auto-calculation
Press Backspace to restore original expression"
                  className="note-textarea"
                />
              </div>
            </div>

            {/* Footer with Variables */}
            {Object.keys(variables).length > 0 && (
              <div className="editor-footer">
                <div className="variables-section">
                  <span className="variables-title">Variables:</span>
                  <div className="variables-list">
                    {Object.entries(variables).slice(0, 8).map(([key, value]) => (
                      <span key={key} className="variable-chip">
                        {key}: {value}
                      </span>
                    ))}
                    {Object.keys(variables).length > 8 && (
                      <span className="more-variables">
                        +{Object.keys(variables).length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Calculator size={64} />
            <h2>No Note Selected</h2>
            <p>Select a note from the sidebar or create a new one to start editing.</p>
          </div>
        )}
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-purple-500 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Create a New Note</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Note Title:</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Enter note title..."
                  className="w-full bg-slate-700 text-white border-b-2 border-purple-500 px-3 py-2 focus:outline-none focus:border-purple-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Initial Content (Optional):</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter initial content..."
                  className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                  rows="3"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isProtected"
                  checked={newNote.isProtected}
                  onChange={(e) => setNewNote({ ...newNote, isProtected: e.target.checked })}
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isProtected" className="text-white">Password protect this note</label>
              </div>

              {newNote.isProtected && (
                <div>
                  <input
                    type="password"
                    value={newNote.password}
                    onChange={(e) => setNewNote({ ...newNote, password: e.target.value })}
                    placeholder="Enter password..."
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewNote({
                    title: '',
                    content: '',
                    isProtected: false,
                    password: ''
                  });
                }}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Create Note button clicked!');
                  handleCreateNote();
                }}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default NotesApp;
