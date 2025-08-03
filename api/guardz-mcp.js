/**
 * Guardz MCP API Client
 * Provides a web-friendly interface to the Guardz Generator MCP server functionality
 */

class GuardzMCPClient {
  constructor() {
    this.baseUrl = 'https://guardz-mcp-api.vercel.app'; // Deployed API endpoint
    this.endpoints = {
      generateTypeGuards: '/api/guardz/generate-type-guards',
      discoverFiles: '/api/guardz/discover-files',
      validateTypeScript: '/api/guardz/validate-typescript',
      formatCode: '/api/guardz/format-code',
      lintCode: '/api/guardz/lint-code',
      getProjectInfo: '/api/guardz/project-info'
    };
  }

  /**
   * Generate TypeScript type guards from source files
   */
  async generateTypeGuards(options) {
    try {
      const response = await fetch(this.endpoints.generateTypeGuards, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating type guards:', error);
      throw error;
    }
  }

  /**
   * Discover TypeScript files for type guard generation
   */
  async discoverFiles(options) {
    try {
      const response = await fetch(this.endpoints.discoverFiles, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error discovering files:', error);
      throw error;
    }
  }

  /**
   * Validate TypeScript files
   */
  async validateTypeScript(options) {
    try {
      const response = await fetch(this.endpoints.validateTypeScript, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating TypeScript:', error);
      throw error;
    }
  }

  /**
   * Format code using Prettier
   */
  async formatCode(options) {
    try {
      const response = await fetch(this.endpoints.formatCode, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error formatting code:', error);
      throw error;
    }
  }

  /**
   * Lint code using ESLint
   */
  async lintCode(options) {
    try {
      const response = await fetch(this.endpoints.lintCode, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error linting code:', error);
      throw error;
    }
  }

  /**
   * Get project information
   */
  async getProjectInfo() {
    try {
      const response = await fetch(this.endpoints.getProjectInfo, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting project info:', error);
      throw error;
    }
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.GuardzMCPClient = GuardzMCPClient;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GuardzMCPClient;
} 