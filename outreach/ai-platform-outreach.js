/**
 * AI Platform Outreach Script
 * 
 * This script helps automate outreach to AI platforms about the Guardz MCP API
 */

class AIPlatformOutreach {
  constructor() {
    this.platforms = {
      claude: {
        name: 'Claude (Anthropic)',
        contact: 'https://www.anthropic.com/contact',
        integration: 'https://thiennp.github.io/integrations/claude-integration.js',
        description: 'Direct API integration with comprehensive TypeScript support'
      },
      chatgpt: {
        name: 'ChatGPT (OpenAI)',
        contact: 'https://openai.com/contact',
        integration: 'https://thiennp.github.io/integrations/chatgpt-integration.js',
        description: 'Function calling integration with type guard generation'
      },
      githubCopilot: {
        name: 'GitHub Copilot',
        contact: 'https://github.com/github/feedback/discussions',
        integration: 'https://thiennp.github.io/AI-PLATFORM-INTEGRATION.md#github-copilot',
        description: 'IDE integration for real-time type guard suggestions'
      },
      cursor: {
        name: 'Cursor AI',
        contact: 'https://cursor.sh/contact',
        integration: 'https://thiennp.github.io/AI-PLATFORM-INTEGRATION.md#cursor-ai',
        description: 'Editor integration with context-aware type guard generation'
      },
      vscode: {
        name: 'VS Code Extensions',
        contact: 'https://code.visualstudio.com/api/working-with-extensions/publishing-extension',
        integration: 'https://thiennp.github.io/AI-PLATFORM-INTEGRATION.md#vs-code-extensions',
        description: 'Extension marketplace integration for type guard generation'
      },
      jetbrains: {
        name: 'JetBrains IDEs',
        contact: 'https://plugins.jetbrains.com/',
        integration: 'https://thiennp.github.io/AI-PLATFORM-INTEGRATION.md#jetbrains-ides',
        description: 'Plugin system integration for IntelliJ, WebStorm, etc.'
      }
    };
    
    this.apiInfo = {
      baseUrl: 'https://guardz-mcp-api.vercel.app',
      documentation: 'https://thiennp.github.io/README.md',
      webInterface: 'https://thiennp.github.io/guardz-mcp.html',
      announcement: 'https://thiennp.github.io/AI-PLATFORM-ANNOUNCEMENT.md'
    };
  }

  /**
   * Generate outreach message for a specific platform
   */
  generateOutreachMessage(platformKey) {
    const platform = this.platforms[platformKey];
    if (!platform) {
      throw new Error(`Unknown platform: ${platformKey}`);
    }

    return `
Subject: Guardz MCP API Integration Opportunity - TypeScript Type Guard Generation

Dear ${platform.name} Team,

I'm reaching out to introduce Guardz MCP, a new API that generates TypeScript type guards from source code, and to explore potential integration opportunities with ${platform.name}.

## About Guardz MCP

Guardz MCP is a Model Context Protocol (MCP) server that provides AI platforms with the ability to generate runtime validation functions from TypeScript interfaces. This enhances type safety and developer productivity.

## Key Benefits for ${platform.name}

- **Enhanced TypeScript Support**: Generate type guards on-the-fly
- **Code Quality**: Validate and format TypeScript code automatically
- **Developer Experience**: Improve type safety in user projects
- **Learning Tool**: Demonstrate type guard concepts with working examples

## Integration Ready

I've prepared a complete integration package for ${platform.name}:

- **API Documentation**: ${this.apiInfo.documentation}
- **Integration Guide**: ${platform.integration}
- **Web Interface**: ${this.apiInfo.webInterface}
- **Technical Specifications**: ${this.apiInfo.announcement}

## Quick Demo

Test the API immediately:
\`\`\`bash
curl -X POST ${this.apiInfo.baseUrl}/api/guardz/generate-type-guards \\
  -H "Content-Type: application/json" \\
  -d '{"files":["interface User { name: string; age: number; }"]}'
\`\`\`

## Next Steps

1. **Review the integration documentation**
2. **Test the API with your use cases**
3. **Discuss integration possibilities**
4. **Explore collaboration opportunities**

## Contact Information

- **Email**: thiennp@example.com
- **GitHub**: https://github.com/thiennp
- **Project**: https://github.com/thiennp/thiennp.github.io

I'm excited about the potential for collaboration and would welcome the opportunity to discuss how Guardz MCP could enhance ${platform.name}'s TypeScript capabilities.

Best regards,
Thien Nguyen
Developer & Creator of Guardz MCP
    `.trim();
  }

  /**
   * Generate technical integration summary
   */
  generateTechnicalSummary() {
    return `
## Technical Integration Summary

### API Endpoints
- POST /api/guardz/generate-type-guards - Generate type guards
- POST /api/guardz/validate-typescript - Validate TypeScript
- POST /api/guardz/format-code - Format with Prettier
- POST /api/guardz/lint-code - Lint with ESLint
- GET /api/guardz/project-info - Get project info
- GET /api/health - Health check

### Integration Methods
1. **Direct API Calls**: RESTful endpoints with JSON
2. **Function Calling**: ChatGPT-style function definitions
3. **Client Libraries**: JavaScript/TypeScript SDKs
4. **Web Interface**: Ready-to-use web application

### Technical Specifications
- **Base URL**: ${this.apiInfo.baseUrl}
- **Response Time**: < 2 seconds average
- **File Size Limit**: 50MB per request
- **CORS**: Enabled for cross-origin requests
- **Rate Limiting**: Production-ready

### Available Integrations
${Object.entries(this.platforms).map(([key, platform]) => 
  `- **${platform.name}**: ${platform.description}`
).join('\n')}
    `.trim();
  }

  /**
   * Generate platform-specific integration code
   */
  generateIntegrationCode(platformKey) {
    const platform = this.platforms[platformKey];
    
    switch (platformKey) {
      case 'claude':
        return `
// Claude Integration Example
const guardzAPI = new ClaudeGuardzIntegration();

const result = await guardzAPI.generateTypeGuards([
  'interface User { name: string; age: number; }'
], {
  postProcess: true,
  verbose: true
});

console.log('Generated type guards:', result);
        `.trim();

      case 'chatgpt':
        return `
// ChatGPT Function Calling
const functionCall = {
  name: "generate_type_guards",
  arguments: {
    files: ["interface User { name: string; age: number; }"],
    postProcess: true
  }
};

// Execute via ChatGPT's function calling system
const result = await executeFunction(functionCall);
        `.trim();

      case 'githubCopilot':
        return `
// GitHub Copilot Integration
interface GuardzMCPClient {
  generateTypeGuards(files: string[], options?: TypeGuardOptions): Promise<TypeGuardResult>;
  validateTypeScript(files: string[]): Promise<ValidationResult>;
}

// Copilot can suggest this integration
const guardzClient = new GuardzMCPClient();
const typeGuards = await guardzClient.generateTypeGuards([userInterface]);
        `.trim();

      default:
        return `
// Generic Integration
const response = await fetch('${this.apiInfo.baseUrl}/api/guardz/generate-type-guards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    files: ['interface User { name: string; age: number; }'],
    postProcess: true
  })
});

const result = await response.json();
        `.trim();
    }
  }

  /**
   * Generate outreach campaign summary
   */
  generateCampaignSummary() {
    const platforms = Object.keys(this.platforms);
    
    return `
# AI Platform Outreach Campaign Summary

## Target Platforms
${platforms.map(p => `- ${this.platforms[p].name}`).join('\n')}

## Campaign Goals
1. **Awareness**: Introduce Guardz MCP to AI platform teams
2. **Integration**: Encourage platform adoption of the API
3. **Collaboration**: Build partnerships for enhanced TypeScript support
4. **Feedback**: Gather input for API improvements

## Key Messages
- **Problem**: TypeScript developers need better type guard generation tools
- **Solution**: Guardz MCP provides AI-powered type guard generation
- **Benefit**: Enhanced type safety and developer productivity
- **Opportunity**: Ready-to-integrate API with comprehensive documentation

## Success Metrics
- Platform team responses
- Integration discussions
- API usage from platforms
- Community adoption

## Next Steps
1. Send personalized outreach messages
2. Follow up with technical discussions
3. Provide integration support
4. Monitor and measure adoption
    `.trim();
  }

  /**
   * Generate all outreach materials
   */
  generateAllMaterials() {
    const materials = {};
    
    // Generate messages for each platform
    Object.keys(this.platforms).forEach(platformKey => {
      materials[`${platformKey}_outreach`] = this.generateOutreachMessage(platformKey);
      materials[`${platformKey}_integration`] = this.generateIntegrationCode(platformKey);
    });
    
    // Generate general materials
    materials.technical_summary = this.generateTechnicalSummary();
    materials.campaign_summary = this.generateCampaignSummary();
    
    return materials;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.AIPlatformOutreach = AIPlatformOutreach;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIPlatformOutreach;
}

// Example usage
if (typeof window !== 'undefined') {
  const outreach = new AIPlatformOutreach();
  
  // Generate Claude outreach message
  console.log('Claude Outreach Message:');
  console.log(outreach.generateOutreachMessage('claude'));
  
  // Generate technical summary
  console.log('Technical Summary:');
  console.log(outreach.generateTechnicalSummary());
} 