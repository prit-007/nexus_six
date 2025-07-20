// Add built-in math functions
const BUILTIN_FUNCTIONS = {
  sum: (...args) => {
    const numbers = args.flat().filter(n => !isNaN(parseFloat(n)));
    return numbers.reduce((acc, val) => acc + parseFloat(val), 0);
  },
  
  avg: (...args) => {
    const numbers = args.flat().filter(n => !isNaN(parseFloat(n)));
    if (numbers.length === 0) return 0;
    return numbers.reduce((acc, val) => acc + parseFloat(val), 0) / numbers.length;
  },
  
  average: (...args) => BUILTIN_FUNCTIONS.avg(...args),
  
  min: (...args) => {
    const numbers = args.flat().filter(n => !isNaN(parseFloat(n)));
    if (numbers.length === 0) return 0;
    return Math.min(...numbers.map(n => parseFloat(n)));
  },
  
  max: (...args) => {
    const numbers = args.flat().filter(n => !isNaN(parseFloat(n)));
    if (numbers.length === 0) return 0;
    return Math.max(...numbers.map(n => parseFloat(n)));
  },
  
  round: (num, decimals = 0) => Math.round(parseFloat(num) * Math.pow(10, decimals)) / Math.pow(10, decimals),
  sqrt: (num) => Math.sqrt(parseFloat(num)),
  pow: (base, exp) => Math.pow(parseFloat(base), parseFloat(exp)),
  abs: (num) => Math.abs(parseFloat(num)),
  floor: (num) => Math.floor(parseFloat(num)),
  ceil: (num) => Math.ceil(parseFloat(num)),
  sin: (num) => Math.sin(parseFloat(num)),
  cos: (num) => Math.cos(parseFloat(num)),
  tan: (num) => Math.tan(parseFloat(num)),
  log: (num) => Math.log10(parseFloat(num)),
  ln: (num) => Math.log(parseFloat(num))
};

class CalculationEngine {
  constructor() {
    this.variables = {};
    this.functions = { ...BUILTIN_FUNCTIONS };
  }

  // Enhanced function parsing
  parseFunction(expression, context = {}) {
    // Match function calls like sum(1,2,3) or avg(x,y,z)
    const functionRegex = /(\w+)\s*\(\s*([^)]*)\s*\)/g;
    
    return expression.replace(functionRegex, (match, funcName, argsStr) => {
      if (this.functions[funcName.toLowerCase()]) {
        try {
          // Parse arguments
          const args = argsStr.split(',').map(arg => {
            const trimmed = arg.trim();
            
            // If it's a variable, get its value
            if (context[trimmed] !== undefined) {
              return context[trimmed];
            }
            
            // If it's a number, return it
            if (!isNaN(parseFloat(trimmed))) {
              return parseFloat(trimmed);
            }
            
            // Try to evaluate as expression
            try {
              return this.evaluate(trimmed, context);
            } catch {
              return trimmed;
            }
          });
          
          const result = this.functions[funcName.toLowerCase()](...args);
          return result.toString();
        } catch (error) {
          console.error(`Error executing function ${funcName}:`, error);
          return match;
        }
      }
      return match;
    });
  }

  evaluate(expression, context = {}) {
    try {
      // First, parse functions
      let processedExpression = this.parseFunction(expression, { ...this.variables, ...context });
      
      // Then substitute variables
      for (const [varName, varValue] of Object.entries({ ...this.variables, ...context })) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        processedExpression = processedExpression.replace(regex, varValue.toString());
      }
      
      // Replace ^ with ** for JavaScript
      processedExpression = processedExpression.replace(/\^/g, '**');
      
      // Evaluate the expression
      const result = new Function(`"use strict"; return (${processedExpression})`)();
      
      return isNaN(result) ? expression : result;
    } catch (error) {
      console.error('Evaluation error:', error);
      return expression;
    }
  }

  processDocument(content) {
    const lines = content.split('\n');
    const results = {};
    this.variables = {};
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Variable assignment
      const assignmentMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if (assignmentMatch) {
        const [, varName, expression] = assignmentMatch;
        const result = this.evaluate(expression, { lineResults: results });
        this.variables[varName] = result;
        results[index] = result;
        return;
      }
      
      // Expression evaluation
      const result = this.evaluate(trimmedLine, { lineResults: results });
      if (result !== trimmedLine) {
        results[index] = result;
      }
    });
    
    return { results, variables: this.variables };
  }
}

export default CalculationEngine;
