// Enhanced Calculation Engine for 1000+ lines with robust performance
class CalculationEngine {
  constructor() {
    this.variables = new Map();
    this.lineResults = new Map();
    this.precision = 2;
    this.currencySymbol = '$';
    this.debugMode = false;
    this.maxIterations = 10; // Prevent infinite loops in complex calculations
  }

  // Main evaluation method - extremely robust for large documents
  evaluate(expression, context = {}) {
    if (!expression || typeof expression !== 'string') {
      return '';
    }

    try {
      // Clean and prepare expression
      const cleanExpression = this.cleanExpression(expression);
      if (!cleanExpression) return '';

      // Apply context (variables and line results) FIRST
      const processedExpression = this.applyContext(cleanExpression, context);
      
      // Check if this is just a number after substitution
      const numValue = parseFloat(processedExpression);
      if (!isNaN(numValue) && isFinite(numValue) && processedExpression.trim() === numValue.toString()) {
        return numValue;
      }
      
      // Evaluate the mathematical expression
      const result = this.evaluateMathExpression(processedExpression);
      
      return this.formatResult(result);
    } catch (error) {
      // Fallback: Try simple math evaluation for basic expressions
      try {
        const cleanExp = this.cleanExpression(expression);
        const processedExp = this.applyContext(cleanExp, context);
        
        // Only allow basic math characters for fallback
        if (/^[0-9+\-*/.()^% \t]+$/.test(processedExp)) {
          const fallbackResult = new Function(`"use strict"; return (${processedExp.replace(/\^/g, '**')})`)();
          if (typeof fallbackResult === 'number' && isFinite(fallbackResult)) {
            return this.formatResult(fallbackResult);
          }
        }
      } catch (fallbackError) {
        // Silent fallback failure
      }
      
      return '';
    }
  }

  // Process entire document with optimized performance for 1000+ lines
  processDocument(content) {
    if (!content) return { results: {}, variables: {} };

    const lines = content.split('\n');
    const results = new Map();
    const variables = new Map();
    const calculations = [];
    const variableOrder = [];

    // Performance optimization: Pre-compile regex patterns
    const variableRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:]\s*(.+)$/;
    const calculationRegex = /(.+?)[:=]\s*=?(.+)$/;
    const expressionRegex = /^=(.+)$/;

    // First pass: Extract variables and identify calculations
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      if (!trimmedLine) return;

      // Variable assignment: variable = value OR variable: value
      const varMatch = trimmedLine.match(variableRegex);
      if (varMatch) {
        const [, varName, expression] = varMatch;
        try {
          const result = this.evaluateMathExpression(this.cleanExpression(expression));
          if (typeof result === 'number' && isFinite(result)) {
            variables.set(varName, result);
            results.set(lineNumber, result);
            variableOrder.push({ lineNumber, varName, expression: expression.trim() });
          }
        } catch (error) {
          if (this.debugMode) console.warn(`Error in variable ${varName}:`, error);
        }
        return;
      }

      // Mathematical expressions with labels
      const calcMatch = trimmedLine.match(calculationRegex);
      if (calcMatch) {
        const [, label, expression] = calcMatch;
        calculations.push({
          lineNumber,
          label: label.trim(),
          expression: expression.trim(),
          originalLine: trimmedLine
        });
        return;
      }

      // Pure expressions starting with =
      const exprMatch = trimmedLine.match(expressionRegex);
      if (exprMatch) {
        calculations.push({
          lineNumber,
          label: `Line ${lineNumber}`,
          expression: exprMatch[1].trim(),
          originalLine: trimmedLine
        });
      }
    });

    // Multi-pass resolution for interdependent calculations
    let iterations = 0;
    let hasChanges = true;

    while (hasChanges && iterations < this.maxIterations) {
      hasChanges = false;
      iterations++;

      // Process variables first (they might depend on previous calculations)
      variableOrder.forEach(varInfo => {
        try {
          const context = {
            ...Object.fromEntries(variables),
            lineResults: Object.fromEntries(results)
          };
          
          const result = this.evaluate(varInfo.expression, context);
          if (result !== '' && variables.get(varInfo.varName) !== result) {
            variables.set(varInfo.varName, parseFloat(result));
            results.set(varInfo.lineNumber, parseFloat(result));
            hasChanges = true;
          }
        } catch (error) {
          if (this.debugMode) console.warn(`Error in variable ${varInfo.varName}:`, error);
        }
      });

      // Process calculations
      calculations.forEach(calc => {
        try {
          const context = {
            ...Object.fromEntries(variables),
            lineResults: Object.fromEntries(results)
          };
          
          const result = this.evaluate(calc.expression, context);
          if (result !== '' && results.get(calc.lineNumber) !== parseFloat(result)) {
            results.set(calc.lineNumber, parseFloat(result));
            hasChanges = true;
          }
        } catch (error) {
          if (this.debugMode) console.warn(`Error in line ${calc.lineNumber}:`, error);
        }
      });
    }

    return {
      results: Object.fromEntries(results),
      variables: Object.fromEntries(variables)
    };
  }

  // Clean and normalize expression with enhanced safety
  cleanExpression(expression) {
    if (!expression) return '';
    
    return expression
      .trim()
      .replace(/^=+/, '') // Remove leading = signs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/×/g, '*') // Replace multiplication symbol
      .replace(/÷/g, '/') // Replace division symbol
      .replace(/−/g, '-') // Replace minus symbol
      .replace(/\$|€|£|¥|₹|₽|＄/g, '') // Remove currency symbols
      .replace(/,(\d{3})/g, '$1') // Remove thousand separators
      .replace(/(\d)\s+(\d)/g, '$1$2') // Remove spaces between digits
      .replace(/([a-zA-Z_]\w*)\s*([+\-*/])/g, '$1 $2') // Space around operators
      .replace(/([+\-*/])\s*([a-zA-Z_]\w*)/g, '$1 $2');
  }

  // Apply context with optimized performance
  applyContext(expression, context = {}) {
    let processed = expression;

    // Replace line references (@1, @2, etc.) - most specific first
    processed = processed.replace(/@(\d+)/g, (match, lineNum) => {
      const lineNumber = parseInt(lineNum);
      const value = context.lineResults?.[lineNumber];
      return value !== undefined ? value.toString() : '0';
    });

    // Replace variables - sort by length (descending) to avoid partial replacements
    if (context) {
      const sortedVars = Object.entries(context)
        .filter(([varName, value]) => varName !== 'lineResults' && typeof value === 'number')
        .sort(([a], [b]) => b.length - a.length);

      sortedVars.forEach(([varName, value]) => {
        const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
        processed = processed.replace(regex, value.toString());
      });
    }

    return processed;
  }

  // Escape special characters in regex
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Enhanced mathematical expression evaluation with security
  evaluateMathExpression(expression) {
    if (!expression || expression.trim() === '') {
      return 0;
    }

    const trimmed = expression.trim();

    // Handle built-in functions first
    if (this.containsFunction(trimmed)) {
      return this.evaluateFunction(trimmed);
    }

    // Handle basic mathematical expressions
    try {
      // Enhanced security: More flexible whitelist of allowed characters
      // Allow numbers, operators, parentheses, spaces, and basic math symbols
      const allowedChars = /^[0-9+\-*/.()^% \t]+$/;
      if (!allowedChars.test(trimmed)) {
        throw new Error('Invalid characters in expression');
      }

      // Additional validation: Check for balanced parentheses
      if (!this.isBalancedParentheses(trimmed)) {
        throw new Error('Unbalanced parentheses');
      }

      // Prevent division by zero (more comprehensive check)
      if (/\/\s*0(?!\d)/.test(trimmed)) {
        throw new Error('Division by zero');
      }

      // Replace ^ with ** for JavaScript exponentiation
      const jsExpression = trimmed.replace(/\^/g, '**');

      // Use Function constructor for safe evaluation
      const result = new Function(`"use strict"; return (${jsExpression})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid calculation result');
      }

      return result;
    } catch (error) {
      throw new Error(`Math evaluation failed: ${error.message}`);
    }
  }

  // Check if expression contains functions
  containsFunction(expression) {
    return /\b(sum|avg|average|min|max|round|sqrt|pow|abs|floor|ceil|sin|cos|tan|log|ln)\s*\(/i.test(expression);
  }

  // Check for balanced parentheses
  isBalancedParentheses(expression) {
    let count = 0;
    for (const char of expression) {
      if (char === '(') count++;
      else if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  // Enhanced function evaluation with more built-in functions
  evaluateFunction(expression) {
    // Extract function calls with nested function support
    const funcRegex = /(\w+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/;
    const funcMatch = expression.match(funcRegex);
    
    if (!funcMatch) {
      throw new Error('Invalid function syntax');
    }

    const [fullMatch, funcName, argsStr] = funcMatch;
    
    // Parse arguments, handling nested expressions
    const args = this.parseArguments(argsStr);
    const numericArgs = args.map(arg => {
      const trimmed = arg.trim();
      // If argument is a number, parse it; if it's an expression, evaluate it
      if (/^-?\d*\.?\d+$/.test(trimmed)) {
        return parseFloat(trimmed);
      } else {
        return this.evaluateMathExpression(trimmed);
      }
    });

    // Execute function
    switch (funcName.toLowerCase()) {
      case 'sum':
        return numericArgs.reduce((sum, val) => sum + val, 0);
      
      case 'avg':
      case 'average':
        return numericArgs.length > 0 ? numericArgs.reduce((sum, val) => sum + val, 0) / numericArgs.length : 0;
      
      case 'min':
        return numericArgs.length > 0 ? Math.min(...numericArgs) : 0;
      
      case 'max':
        return numericArgs.length > 0 ? Math.max(...numericArgs) : 0;
      
      case 'round':
        const [value, decimals = 0] = numericArgs;
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
      
      case 'sqrt':
        return Math.sqrt(numericArgs[0]);
      
      case 'pow':
        return Math.pow(numericArgs[0], numericArgs[1] || 2);
      
      case 'abs':
        return Math.abs(numericArgs[0]);
      
      case 'floor':
        return Math.floor(numericArgs[0]);
      
      case 'ceil':
        return Math.ceil(numericArgs[0]);
      
      case 'sin':
        return Math.sin(numericArgs[0]);
      
      case 'cos':
        return Math.cos(numericArgs[0]);
      
      case 'tan':
        return Math.tan(numericArgs[0]);
      
      case 'log':
        return Math.log10(numericArgs[0]);
      
      case 'ln':
        return Math.log(numericArgs[0]);
      
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
  }

  // Parse function arguments with proper comma handling
  parseArguments(argsStr) {
    if (!argsStr.trim()) return [];
    
    const args = [];
    let current = '';
    let parenCount = 0;
    
    for (const char of argsStr) {
      if (char === ',' && parenCount === 0) {
        args.push(current.trim());
        current = '';
      } else {
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(current.trim());
    }
    
    return args;
  }

  // Format result with intelligent precision
  formatResult(result) {
    if (typeof result !== 'number' || !isFinite(result)) {
      return '';
    }

    // Handle very large numbers
    if (Math.abs(result) > 1e15) {
      return result.toExponential(this.precision);
    }

    // Handle very small numbers
    if (Math.abs(result) < 1e-10 && result !== 0) {
      return result.toExponential(this.precision);
    }

    // Round to specified precision
    const rounded = Math.round(result * Math.pow(10, this.precision)) / Math.pow(10, this.precision);
    
    // Format intelligently
    if (rounded === Math.floor(rounded) && Math.abs(rounded) < 1e10) {
      return rounded.toString();
    } else {
      return rounded.toFixed(this.precision).replace(/\.?0+$/, '');
    }
  }

  // Performance optimization: Batch process multiple expressions
  batchEvaluate(expressions, context = {}) {
    return expressions.map(expr => this.evaluate(expr, context));
  }

  // Utility methods
  setPrecision(precision) {
    this.precision = Math.max(0, Math.min(15, precision));
  }

  setCurrencySymbol(symbol) {
    this.currencySymbol = symbol;
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  clear() {
    this.variables.clear();
    this.lineResults.clear();
  }

  getVariables() {
    return Object.fromEntries(this.variables);
  }

  getLineResults() {
    return Object.fromEntries(this.lineResults);
  }

  // Performance monitoring
  getPerformanceStats() {
    return {
      variableCount: this.variables.size,
      lineResultCount: this.lineResults.size,
      maxIterations: this.maxIterations
    };
  }
}

export default CalculationEngine;
