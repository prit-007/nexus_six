import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CalculationEngine from '../utils/calculationEngineEnhanced';
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
  Search
} from 'lucide-react';
import './NotesApp.css';

const NotesApp = () => {
  const navigate = useNavigate();
  
  // Core state
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [activeNoteTitle, setActiveNoteTitle] = useState('Untitled Note');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
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

  // Refs
  const textareaRef = useRef(null);
  const calculationEngine = useRef(new CalculationEngine());
  const processingTimeoutRef = useRef(null);
  const titleInputRef = useRef(null);

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      setNotes(parsedNotes);
      if (parsedNotes.length > 0) {
        setActiveNote(parsedNotes[0].id);
        setActiveNoteTitle(parsedNotes[0].title);
        setEditorContent(parsedNotes[0].content);
      }
    }
  }, []);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

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

  // Key handling
  const handleKeyDown = useCallback((event) => {
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
  }, [handleAutoReplacement, handleBackspaceRestore]);

  // Content change handler
  const handleContentChange = useCallback((event) => {
    const value = event.target.value;
    setEditorContent(value);

    // Auto-save current note
    if (activeNote) {
      const updatedNotes = notes.map(note => 
        note.id === activeNote 
          ? { ...note, content: value, updatedAt: new Date().toISOString() }
          : note
      );
      setNotes(updatedNotes);
      saveNotesToStorage(updatedNotes);
    }

    // Debounced processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      processCalculations();
    }, 500);
  }, [activeNote, notes, saveNotesToStorage, processCalculations]);

  // Note management
  const createNewNote = () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setActiveNote(newNote.id);
    setActiveNoteTitle(newNote.title);
    setEditorContent('');
    saveNotesToStorage(updatedNotes);
  };

  const selectNote = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setActiveNote(noteId);
      setActiveNoteTitle(note.title);
      setEditorContent(note.content);
    }
  };

  const deleteNote = (noteId) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    saveNotesToStorage(updatedNotes);
    
    if (activeNote === noteId) {
      if (updatedNotes.length > 0) {
        selectNote(updatedNotes[0].id);
      } else {
        setActiveNote(null);
        setActiveNoteTitle('');
        setEditorContent('');
      }
    }
  };

  const updateNoteTitle = (newTitle) => {
    if (activeNote && newTitle.trim()) {
      const updatedNotes = notes.map(note => 
        note.id === activeNote 
          ? { ...note, title: newTitle.trim(), updatedAt: new Date().toISOString() }
          : note
      );
      setNotes(updatedNotes);
      setActiveNoteTitle(newTitle.trim());
      saveNotesToStorage(updatedNotes);
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
    navigate('/');
  };

  // Filter notes based on search
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="notes-app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="app-title">
            <Calculator size={24} />
            <span>Smart Notes</span>
          </div>
          <button onClick={logout} className="logout-btn">
            <LogOut size={16} />
          </button>
        </div>

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
          <button onClick={createNewNote} className="new-note-btn">
            <Plus size={16} />
            New Note
          </button>
        </div>

        <div className="notes-list">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-item ${activeNote === note.id ? 'active' : ''}`}
              onClick={() => selectNote(note.id)}
            >
              <div className="note-header">
                <FileText size={16} />
                <span className="note-title">{note.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
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
                {new Date(note.updatedAt).toLocaleDateString()}
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
            <h2>Welcome to Smart Notes</h2>
            <p>Create your first note to get started with intelligent mathematical note-taking.</p>
            <button onClick={createNewNote} className="create-first-note-btn">
              <Plus size={20} />
              Create First Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesApp;
