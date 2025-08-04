/**
 * Claude AI Integration for Guardz MCP API
 * 
 * This file provides Claude with direct access to the Guardz MCP API
 * for TypeScript type guard generation.
 */

class ClaudeGuardzIntegration {
  constructor() {
    this.baseUrl = 'https://guardz-mcp-api.vercel.app';
    this.endpoints = {
      generateTypeGuards: '/api/guardz/generate-type-guards',
      validateTypeScript: '/api/guardz/validate-typescript',
      formatCode: '/api/guardz/format-code',
      lintCode: '/api/guardz/lint-code',
      discoverFiles: '/api/guardz/discover-files',
      projectInfo: '/api/guardz/project-info',
      health: '/api/health'
    };
  }

  /**
   * Generate TypeScript type guards from source code
   * @param {string[]} files - Array of TypeScript file contents
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated type guards
   */
  async generateTypeGuards(files, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${this.endpoints.generateTypeGuards}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          config: options.config,
          type: options.type,
          guardName: options.guardName,
          includes: options.includes,
          excludes: options.excludes,
          postProcess: options.postProcess ?? true,
          verbose: options.verbose ?? false,
          debug: options.debug ?? false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating type guards:', error);
      throw error;
    }
  }

  /**
   * Validate TypeScript code
   * @param {string[]} files - Array of TypeScript file contents
   * @returns {Promise<Object>} Validation result
   */
  async validateTypeScript(files) {
    try {
      const response = await fetch(`${this.baseUrl}${this.endpoints.validateTypeScript}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating TypeScript:', error);
      throw error;
    }
  }

  /**
   * Format code using Prettier
   * @param {string[]} files - Array of file contents to format
   * @returns {Promise<Object>} Formatted code
   */
  async formatCode(files) {
    try {
      const response = await fetch(`${this.baseUrl}${this.endpoints.formatCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error formatting code:', error);
      throw error;
    }
  }

  /**
   * Lint code using ESLint
   * @param {string[]} files - Array of file contents to lint
   * @param {boolean} fix - Whether to auto-fix issues
   * @returns {Promise<Object>} Linting result
   */
  async lintCode(files, fix = false) {
    try {
      const response = await fetch(`${this.baseUrl}${this.endpoints.lintCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files, fix })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error linting code:', error);
      throw error;
    }
  }

  /**
   * Get project information
   * @returns {Promise<Object>} Project info
   */
  async getProjectInfo() {
    try {
      const response = await fetch(`${this.baseUrl}${this.endpoints.projectInfo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting project info:', error);
      throw error;
    }
  }

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}${this.endpoints.health}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }

  /**
   * Complete workflow: validate, generate, format, and lint
   * @param {string[]} files - TypeScript file contents
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Complete workflow result
   */
  async completeWorkflow(files, options = {}) {
    try {
      // Step 1: Validate TypeScript
      console.log('Validating TypeScript...');
      const validation = await this.validateTypeScript(files);
      if (!validation.success) {
        throw new Error('TypeScript validation failed');
      }

      // Step 2: Generate type guards
      console.log('Generating type guards...');
      const generation = await this.generateTypeGuards(files, options);

      // Step 3: Format generated code
      console.log('Formatting code...');
      const generatedFiles = generation.files.map(f => f.content);
      const formatting = await this.formatCode(generatedFiles);

      // Step 4: Lint formatted code
      console.log('Linting code...');
      const formattedFiles = formatting.files.map(f => f.content);
      const linting = await this.lintCode(formattedFiles, true);

      return {
        success: true,
        validation,
        generation,
        formatting,
        linting,
        summary: {
          inputFiles: files.length,
          generatedGuards: generation.files.length,
          formattedFiles: formatting.files.length,
          lintedFiles: linting.success ? formattedFiles.length : 0
        }
      };
    } catch (error) {
      console.error('Workflow failed:', error);
      throw error;
    }
  }
}

// Example usage for Claude
const guardzAPI = new ClaudeGuardzIntegration();

// Example: Generate type guards for a User interface
async function exampleUsage() {
  try {
    const userInterface = `
      interface User {
        name: string;
        age: number;
        email?: string;
        preferences: {
          theme: 'light' | 'dark';
          notifications: boolean;
        };
      }
    `;

    const result = await guardzAPI.generateTypeGuards([userInterface], {
      postProcess: true,
      verbose: true
    });

    console.log('Generated type guards:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for use in Claude's environment
if (typeof window !== 'undefined') {
  window.ClaudeGuardzIntegration = ClaudeGuardzIntegration;
  window.guardzAPI = guardzAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ClaudeGuardzIntegration, guardzAPI };
}

// Auto-run example if in browser
if (typeof window !== 'undefined' && window.location.href.includes('claude')) {
  exampleUsage();
} 