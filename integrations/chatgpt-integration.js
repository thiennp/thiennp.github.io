/**
 * ChatGPT Integration for Guardz MCP API
 * 
 * This file provides ChatGPT with function calling capabilities
 * for the Guardz MCP API.
 */

// Function definitions for ChatGPT
const GUARDZ_FUNCTIONS = [
  {
    name: "generate_type_guards",
    description: "Generate TypeScript type guards from source code",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "TypeScript file contents to process"
        },
        type: {
          type: "string",
          description: "Specific type to generate guard for (optional)"
        },
        guardName: {
          type: "string",
          description: "Custom name for the guard function (optional)"
        },
        postProcess: {
          type: "boolean",
          description: "Run linting and formatting (default: true)"
        },
        verbose: {
          type: "boolean",
          description: "Enable verbose logging (default: false)"
        }
      },
      required: ["files"]
    }
  },
  {
    name: "validate_typescript",
    description: "Validate TypeScript code for errors",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "TypeScript file contents to validate"
        }
      },
      required: ["files"]
    }
  },
  {
    name: "format_code",
    description: "Format code using Prettier",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "File contents to format"
        }
      },
      required: ["files"]
    }
  },
  {
    name: "lint_code",
    description: "Lint code using ESLint",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "File contents to lint"
        },
        fix: {
          type: "boolean",
          description: "Automatically fix issues (default: false)"
        }
      },
      required: ["files"]
    }
  },
  {
    name: "get_project_info",
    description: "Get information about the Guardz MCP project",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

class ChatGPTGuardzIntegration {
  constructor() {
    this.baseUrl = 'https://guardz-mcp-api.vercel.app';
    this.functions = GUARDZ_FUNCTIONS;
  }

  /**
   * Execute a function call
   * @param {string} functionName - Name of the function to call
   * @param {Object} arguments - Function arguments
   * @returns {Promise<Object>} Function result
   */
  async executeFunction(functionName, arguments) {
    try {
      switch (functionName) {
        case 'generate_type_guards':
          return await this.generateTypeGuards(arguments.files, arguments);
        
        case 'validate_typescript':
          return await this.validateTypeScript(arguments.files);
        
        case 'format_code':
          return await this.formatCode(arguments.files);
        
        case 'lint_code':
          return await this.lintCode(arguments.files, arguments.fix);
        
        case 'get_project_info':
          return await this.getProjectInfo();
        
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (error) {
      return {
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Generate TypeScript type guards
   */
  async generateTypeGuards(files, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/guardz/generate-type-guards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        type: options.type,
        guardName: options.guardName,
        postProcess: options.postProcess ?? true,
        verbose: options.verbose ?? false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Validate TypeScript code
   */
  async validateTypeScript(files) {
    const response = await fetch(`${this.baseUrl}/api/guardz/validate-typescript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Format code
   */
  async formatCode(files) {
    const response = await fetch(`${this.baseUrl}/api/guardz/format-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Lint code
   */
  async lintCode(files, fix = false) {
    const response = await fetch(`${this.baseUrl}/api/guardz/lint-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, fix })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get project info
   */
  async getProjectInfo() {
    const response = await fetch(`${this.baseUrl}/api/guardz/project-info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get function definitions for ChatGPT
   */
  getFunctionDefinitions() {
    return this.functions;
  }

  /**
   * Create a ChatGPT-compatible function call
   */
  createFunctionCall(functionName, arguments) {
    return {
      name: functionName,
      arguments: arguments
    };
  }

  /**
   * Example usage for ChatGPT
   */
  async exampleUsage() {
    const userInterface = `
      interface User {
        name: string;
        age: number;
        email?: string;
      }
    `;

    try {
      // Step 1: Validate the TypeScript
      const validation = await this.validateTypeScript([userInterface]);
      console.log('Validation:', validation);

      // Step 2: Generate type guards
      const generation = await this.generateTypeGuards([userInterface], {
        postProcess: true,
        verbose: true
      });
      console.log('Generation:', generation);

      // Step 3: Format the generated code
      const generatedFiles = generation.files.map(f => f.content);
      const formatting = await this.formatCode(generatedFiles);
      console.log('Formatting:', formatting);

      return {
        success: true,
        validation,
        generation,
        formatting
      };
    } catch (error) {
      console.error('Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// ChatGPT System Prompt
const CHATGPT_SYSTEM_PROMPT = `
You have access to the Guardz MCP API for TypeScript type guard generation.

Available Functions:
${GUARDZ_FUNCTIONS.map(f => `- ${f.name}: ${f.description}`).join('\n')}

API Base URL: https://guardz-mcp-api.vercel.app

When users need TypeScript type guards:
1. Use the generate_type_guards function with their TypeScript code
2. Validate TypeScript first if needed
3. Format and lint the generated code
4. Provide complete, working examples

Always include proper error handling and explain the results clearly.
`;

// Export for use in ChatGPT environment
if (typeof window !== 'undefined') {
  window.ChatGPTGuardzIntegration = ChatGPTGuardzIntegration;
  window.GUARDZ_FUNCTIONS = GUARDZ_FUNCTIONS;
  window.CHATGPT_SYSTEM_PROMPT = CHATGPT_SYSTEM_PROMPT;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ChatGPTGuardzIntegration,
    GUARDZ_FUNCTIONS,
    CHATGPT_SYSTEM_PROMPT
  };
}

// Auto-run example if in browser
if (typeof window !== 'undefined' && window.location.href.includes('chatgpt')) {
  const integration = new ChatGPTGuardzIntegration();
  integration.exampleUsage();
} 