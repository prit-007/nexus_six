class CalculationEngine {
  constructor() {
    this.variables = new Map();
    this.lineResults = new Map(); // Store results by line number
    this.precision = 2;
    this.currencySymbol = '$';
  }

  // Parse and evaluate mathematical expressions
  evaluateExpression(expression, lineNumber = null, allLines = []) {
    try {
      // Remove leading = sign if present
      const cleanExpression = expression.startsWith('=') ? expression.slice(1) : expression;
      
      // Replace variables with their values
      let processedExpression = this.replaceVariables(cleanExpression);
      
      // Replace line references (@1, @2, etc.)
      processedExpression = this.replaceLineReferences(processedExpression, allLines);
      
      // Handle built-in functions (sum, avg, min, max)
      processedExpression = this.replaceFunctions(processedExpression);
      
      // Evaluate the mathematical expression
      const result = this.safeEvaluate(processedExpression);
      
      // Store result for line reference
      if (lineNumber !== null) {
        this.lineResults.set(lineNumber, result);
      }
      
      return this.formatNumber(result);
    } catch (error) {
      console.error('Calculation error:', error);
      return 'Error';
    }
  }

  // Replace variables in expression
  replaceVariables(expression) {
    let result = expression;
    for (const [varName, value] of this.variables) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      result = result.replace(regex, value.toString());
    }
    return result;
  }

  // Replace line references (@1, @2, etc.)
  replaceLineReferences(expression, allLines) {
    let result = expression;
    const lineRefRegex = /@(\d+)/g;
    
    result = result.replace(lineRefRegex, (match, lineNum) => {
      const lineIndex = parseInt(lineNum) - 1;
      if (lineIndex >= 0 && lineIndex < allLines.length) {
        const lineContent = allLines[lineIndex];
        const lineResult = this.extractNumberFromLine(lineContent);
        return lineResult !== null ? lineResult.toString() : '0';
      }
      return '0';
    });
    
    return result;
  }

  // Replace function calls (sum, avg, min, max)
  replaceFunctions(expression) {
    let result = expression;
    
    // Handle sum function
    result = result.replace(/sum\s*\(\s*([^)]+)\s*\)/g, (match, args) => {
      const numbers = this.parseArguments(args);
      return numbers.reduce((sum, num) => sum + num, 0).toString();
    });
    
    // Handle avg function
    result = result.replace(/avg\s*\(\s*([^)]+)\s*\)/g, (match, args) => {
      const numbers = this.parseArguments(args);
      const average = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
      return average.toString();
    });
    
    // Handle min function
    result = result.replace(/min\s*\(\s*([^)]+)\s*\)/g, (match, args) => {
      const numbers = this.parseArguments(args);
      return Math.min(...numbers).toString();
    });
    
    // Handle max function
    result = result.replace(/max\s*\(\s*([^)]+)\s*\)/g, (match, args) => {
      const numbers = this.parseArguments(args);
      return Math.max(...numbers).toString();
    });
    
    return result;
  }

  // Parse function arguments
  parseArguments(argsString) {
    return argsString
      .split(',')
      .map(arg => {
        const trimmed = arg.trim();
        const number = parseFloat(trimmed);
        return isNaN(number) ? 0 : number;
      });
  }

  // Safely evaluate mathematical expression
  safeEvaluate(expression) {
    // Remove any potentially dangerous characters
    const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
    
    // Use Function constructor instead of eval for better security
    try {
      const result = new Function('return ' + sanitized)();
      return isNaN(result) ? 0 : result;
    } catch (error) {
      throw new Error('Invalid mathematical expression');
    }
  }

  // Extract variable assignment from a line
  extractVariable(line) {
    const variableRegex = /^(\w+)\s*=\s*([\d.]+)$/;
    const match = line.match(variableRegex);
    
    if (match) {
      const [, varName, value] = match;
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        this.variables.set(varName, numValue);
        return { name: varName, value: numValue };
      }
    }
    return null;
  }

  // Extract number from a line (for line references)
  extractNumberFromLine(line) {
    // First check if line has a calculation result
    const resultRegex = /:\s*([\d.]+)$/;
    const resultMatch = line.match(resultRegex);
    if (resultMatch) {
      return parseFloat(resultMatch[1]);
    }
    
    // Look for any number in the line
    const numberRegex = /([\d.]+)/;
    const numberMatch = line.match(numberRegex);
    if (numberMatch) {
      return parseFloat(numberMatch[1]);
    }
    
    return null;
  }

  // Check if a line contains a calculation
  hasCalculation(line) {
    // Clean the line of HTML tags if present
    const cleanLine = typeof line === 'string' ? line.replace(/<[^>]*>/g, '') : '';
    return /=\s*[^=]+$/.test(cleanLine.trim());
  }

  // Main evaluate method for the new UI
  evaluate(expression, allLines = [], lineIndex = 0) {
    try {
      // Remove leading = sign if present
      const cleanExpression = expression.startsWith('=') ? expression.slice(1) : expression;
      
      // Process variables from all lines first
      allLines.forEach((line, index) => {
        const variable = this.extractVariable(line);
        if (variable && index < lineIndex) {
          this.variables.set(variable.name, variable.value);
        }
      });
      
      // Replace variables with their values
      let processedExpression = this.replaceVariables(cleanExpression);
      
      // Replace line references (@1, @2, etc.)
      processedExpression = this.replaceLineReferences(processedExpression, allLines);
      
      // Handle built-in functions (sum, avg, min, max)
      processedExpression = this.replaceFunctions(processedExpression);
      
      // Evaluate the mathematical expression
      const result = this.safeEvaluate(processedExpression);
      
      // Store result for line reference
      this.lineResults.set(lineIndex, result);
      
      return this.formatNumber(result);
    } catch (error) {
      console.error('Calculation error:', error);
      throw error;
    }
  }

  // Process a single line for calculations
  processLine(line, lineNumber, allLines) {
    // Clean line of HTML tags if present
    const cleanLine = typeof line === 'string' ? line.replace(/<[^>]*>/g, '') : '';
    
    // Skip empty lines
    if (!cleanLine.trim()) return line;
    
    // Check for variable assignment first
    const variable = this.extractVariable(cleanLine);
    if (variable) {
      return line; // Return as-is for variable assignments
    }

    // Check for calculations
    const calculationRegex = /(.*)=([^=]+)$/;
    const match = cleanLine.match(calculationRegex);
    
    if (match) {
      const beforeCalculation = match[1];
      const expression = match[2].trim();
      
      try {
        // Clean all lines for processing
        const cleanAllLines = allLines.map(l => typeof l === 'string' ? l.replace(/<[^>]*>/g, '') : '');
        const result = this.evaluateExpression(expression, lineNumber, cleanAllLines);
        
        // Only replace if we got a valid result
        if (result !== 'Error' && result !== null && result !== undefined) {
          return beforeCalculation + result;
        }
      } catch (error) {
        console.warn(`Calculation error on line ${lineNumber + 1}:`, error);
      }
    }
    
    return line; // Return unchanged if no calculation or error
  }

  // Format number based on precision settings
  formatNumber(number) {
    if (Number.isInteger(number)) {
      return number.toString();
    }
    return number.toFixed(this.precision);
  }

  // Reset all variables and line results
  reset() {
    this.variables.clear();
    this.lineResults.clear();
  }

  // Get stored calculation for a line
  getStoredCalculation(lineNumber) {
    return this.lineResults.get(lineNumber);
  }

  // Set precision for number formatting
  setPrecision(precision) {
    this.precision = Math.max(0, Math.min(10, precision));
  }

  // Set currency symbol
  setCurrencySymbol(symbol) {
    this.currencySymbol = symbol;
  }
}

export default CalculationEngine;
