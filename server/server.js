import express from 'express';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import { TypeGuardGenerator } from 'guardz-generator/dist/core/generators/type-guard/type-guard-generator.js';
import { ServiceFactory } from 'guardz-generator/dist/infrastructure/factories/service-factory.js';
import {
  setDebugMode,
  setVerboseMode,
} from 'guardz-generator/dist/shared/utils/logging.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Temporary file storage
const tempDir = path.join(__dirname, 'temp');
await fs.mkdir(tempDir, { recursive: true });

// Helper function to create temporary files
async function createTempFiles(files) {
  const tempFiles = [];
  for (let i = 0; i < files.length; i++) {
    const fileName = `temp_${Date.now()}_${i}.ts`;
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, files[i]);
    tempFiles.push(filePath);
  }
  return tempFiles;
}

// Helper function to cleanup temporary files
async function cleanupTempFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (error) {
      console.error(`Failed to delete temp file ${file}:`, error);
    }
  }
}

// API Routes

// Generate Type Guards
app.post('/api/guardz/generate-type-guards', async (req, res) => {
  try {
    const {
      files,
      config,
      type,
      guardName,
      includes,
      excludes,
      postProcess = true,
      verbose = false,
      debug = false,
    } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'Files array is required and must contain at least one file'
      });
    }

    // Set logging modes
    setVerboseMode(verbose);
    setDebugMode(debug);

    // Create temporary files
    const tempFiles = await createTempFiles(files);

    try {
      // Use the file discovery pipeline
      const fileDiscoveryPipeline = ServiceFactory.getFileDiscoveryPipeline();

      const discoveryOptions = {
        cliFiles: tempFiles,
        cliIncludes: includes,
        cliExcludes: excludes,
        configPath: config,
      };

      const discoveryResult = await fileDiscoveryPipeline.discoverFiles(discoveryOptions);

      if (discoveryResult.files.length === 0) {
        return res.json({
          success: false,
          message: 'No files found for processing'
        });
      }

      // Create TypeScript program
      const typescriptProgramPipeline = ServiceFactory.getTypeScriptProgramPipeline();
      const programOptions = {
        sourceFiles: discoveryResult.files,
        tsConfigPath: config,
      };

      const programResult = await typescriptProgramPipeline.createProgram(programOptions);

      // Generate type guards
      const generator = new TypeGuardGenerator(
        discoveryResult.files,
        programResult.program
      );

      const options = {
        type,
        guardName,
        postProcess,
      };

      const generatedFiles = generator.generateAllTypeGuards(options);

      // Write files to temporary directory
      await generator.writeTypeGuardsToSameDirectory(generatedFiles);

      // Run post-processing if enabled
      if (postProcess) {
        await generator.runPostProcessing(generatedFiles);
      }

      // Read generated files and return their content
      const generatedContent = [];
      for (const file of generatedFiles) {
        try {
          const content = await fs.readFile(file.fileName, 'utf-8');
          generatedContent.push({
            fileName: path.basename(file.fileName),
            content: content
          });
        } catch (error) {
          console.error(`Failed to read generated file ${file.fileName}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Successfully generated ${generatedFiles.length} type guard files`,
        files: generatedContent
      });

    } finally {
      // Cleanup temporary files
      await cleanupTempFiles(tempFiles);
    }

  } catch (error) {
    console.error('Error generating type guards:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Discover Files
app.post('/api/guardz/discover-files', async (req, res) => {
  try {
    const { cliFiles, cliIncludes, cliExcludes, configPath } = req.body;

    const fileDiscoveryPipeline = ServiceFactory.getFileDiscoveryPipeline();

    const discoveryOptions = {
      cliFiles,
      cliIncludes,
      cliExcludes,
      configPath,
    };

    const discoveryResult = await fileDiscoveryPipeline.discoverFiles(discoveryOptions);

    res.json({
      success: true,
      files: discoveryResult.files,
      source: discoveryResult.source
    });

  } catch (error) {
    console.error('Error discovering files:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Validate TypeScript
app.post('/api/guardz/validate-typescript', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'Files array is required and must contain at least one file'
      });
    }

    // Create temporary files
    const tempFiles = await createTempFiles(files);

    try {
      const typescriptCompiler = ServiceFactory.getTypeScriptCompiler();
      await typescriptCompiler.checkFiles(tempFiles);

      res.json({
        success: true,
        message: `Successfully validated ${files.length} TypeScript files. No compilation errors found.`
      });

    } finally {
      // Cleanup temporary files
      await cleanupTempFiles(tempFiles);
    }

  } catch (error) {
    console.error('Error validating TypeScript:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Format Code
app.post('/api/guardz/format-code', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'Files array is required and must contain at least one file'
      });
    }

    // Create temporary files
    const tempFiles = await createTempFiles(files);

    try {
      const prettier = ServiceFactory.getPrettier();
      const fileSystem = ServiceFactory.getFileSystem();

      const formattedFiles = [];
      for (const file of tempFiles) {
        const content = await fileSystem.readFile(file);
        const formatted = await prettier.format(content, { filepath: file });
        await fileSystem.writeFile(file, formatted);
        
        formattedFiles.push({
          fileName: path.basename(file),
          content: formatted
        });
      }

      res.json({
        success: true,
        message: `Successfully formatted ${files.length} files using Prettier.`,
        files: formattedFiles
      });

    } finally {
      // Cleanup temporary files
      await cleanupTempFiles(tempFiles);
    }

  } catch (error) {
    console.error('Error formatting code:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Lint Code
app.post('/api/guardz/lint-code', async (req, res) => {
  try {
    const { files, fix = false } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'Files array is required and must contain at least one file'
      });
    }

    // Create temporary files
    const tempFiles = await createTempFiles(files);

    try {
      const eslint = ServiceFactory.getESLint();

      if (fix) {
        await eslint.fixFiles(tempFiles);
        res.json({
          success: true,
          message: `Successfully linted and fixed ${files.length} files using ESLint.`
        });
      } else {
        // For now, we'll just run the fix command as the basic lint check
        await eslint.fixFiles(tempFiles);
        res.json({
          success: true,
          message: `Successfully linted ${files.length} files using ESLint.`
        });
      }

    } finally {
      // Cleanup temporary files
      await cleanupTempFiles(tempFiles);
    }

  } catch (error) {
    console.error('Error linting code:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Get Project Info
app.get('/api/guardz/project-info', async (req, res) => {
  try {
    const fileSystem = ServiceFactory.getFileSystem();

    // Check for common config files
    const configFiles = [
      'guardz.generator.config.ts',
      'tsconfig.json',
      'package.json',
    ];

    const existingConfigs = [];
    for (const config of configFiles) {
      try {
        if (await fileSystem.fileExists(config)) {
          existingConfigs.push(config);
        }
      } catch (error) {
        // Ignore errors for non-existent files
      }
    }

    res.json({
      success: true,
      data: {
        availableConfigFiles: existingConfigs,
        guardzGeneratorVersion: '1.12.3',
        mcpVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error getting project info:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Download statistics functionality
class NpmStatsService {
  constructor() {
    this.packages = ['guardz', 'guardz-generator', 'guardz-axios', 'guardz-event'];
    this.reportsDir = path.join(__dirname, 'reports');
  }

  async getDailyDownloads(packageName, date = null) {
    const endpoint = date
      ? `https://api.npmjs.org/downloads/point/${date}/${packageName}`
      : `https://api.npmjs.org/downloads/point/last-day/${packageName}`;
    
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      return { downloads: data.downloads || 0, error: null };
    } catch (error) {
      console.error(`Error fetching daily downloads for ${packageName}:`, error);
      return { downloads: 0, error: error.message };
    }
  }

  async getWeeklyDownloads(packageName) {
    const endpoint = `https://api.npmjs.org/downloads/point/last-week/${packageName}`;
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      return { downloads: data.downloads || 0, error: null };
    } catch (error) {
      console.error(`Error fetching weekly downloads for ${packageName}:`, error);
      return { downloads: 0, error: error.message };
    }
  }

  async getMonthlyDownloads(packageName) {
    const endpoint = `https://api.npmjs.org/downloads/point/last-month/${packageName}`;
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      return { downloads: data.downloads || 0, error: null };
    } catch (error) {
      console.error(`Error fetching monthly downloads for ${packageName}:`, error);
      return { downloads: 0, error: error.message };
    }
  }

  async generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const report = {
      date: today,
      timestamp: new Date().toISOString(),
      packages: {}
    };

    console.log('📊 Generating daily npm download report...');

    for (const packageName of this.packages) {
      console.log(`📦 Fetching data for ${packageName}...`);
      
      const [daily, weekly, monthly] = await Promise.all([
        this.getDailyDownloads(packageName),
        this.getWeeklyDownloads(packageName),
        this.getMonthlyDownloads(packageName)
      ]);

      report.packages[packageName] = {
        daily: daily.downloads || 0,
        weekly: weekly.downloads || 0,
        monthly: monthly.downloads || 0,
        dailyError: daily.error,
        weeklyError: weekly.error,
        monthlyError: monthly.error
      };
    }

    // Create reports directory if it doesn't exist
    await fs.mkdir(this.reportsDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(this.reportsDir, `daily-report-${today}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = path.join(this.reportsDir, `daily-report-${today}.md`);
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(markdownPath, markdown);

    console.log(`📈 Report generated: ${jsonPath}`);
    return report;
  }

  generateMarkdownReport(report) {
    let markdown = `# 📊 NPM Daily Download Report - ${report.date}\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    markdown += `## 📦 Package Statistics\n\n`;

    let totalDaily = 0;
    let totalWeekly = 0;
    let totalMonthly = 0;

    for (const [packageName, stats] of Object.entries(report.packages)) {
      markdown += `### ${packageName}\n\n`;
      markdown += `| Period | Downloads |\n`;
      markdown += `|--------|----------|\n`;
      markdown += `| Today | ${stats.daily} |\n`;
      markdown += `| This Week | ${stats.weekly} |\n`;
      markdown += `| This Month | ${stats.monthly} |\n\n`;

      totalDaily += stats.daily;
      totalWeekly += stats.weekly;
      totalMonthly += stats.monthly;
    }

    markdown += `## 📈 Summary\n\n`;
    markdown += `- **Total Daily Downloads:** ${totalDaily}\n`;
    markdown += `- **Total Weekly Downloads:** ${totalWeekly}\n`;
    markdown += `- **Total Monthly Downloads:** ${totalMonthly}\n\n`;

    return markdown;
  }

  async getAllReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json') && file.startsWith('daily-report-'));
      
      const reports = [];
      for (const file of jsonFiles.sort().reverse()) {
        try {
          const content = await fs.readFile(path.join(this.reportsDir, file), 'utf-8');
          const report = JSON.parse(content);
          reports.push(report);
        } catch (error) {
          console.error(`Error reading report ${file}:`, error);
        }
      }
      
      return reports;
    } catch (error) {
      console.error('Error reading reports directory:', error);
      return [];
    }
  }

  async getLatestReport() {
    const reports = await this.getAllReports();
    return reports.length > 0 ? reports[0] : null;
  }
}

const npmStatsService = new NpmStatsService();

// API endpoints for download statistics
app.get('/api/stats/latest', async (req, res) => {
  try {
    const report = await npmStatsService.getLatestReport();
    if (!report) {
      return res.status(404).json({ error: 'No reports available' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error getting latest stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/all', async (req, res) => {
  try {
    const reports = await npmStatsService.getAllReports();
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error getting all stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats/generate', async (req, res) => {
  try {
    const report = await npmStatsService.generateDailyReport();
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Guardz MCP API Server running on port ${PORT}`);
  console.log(`📱 Web interface available at http://localhost:${PORT}/guardz-mcp.html`);
  console.log(`🔧 API endpoints available at http://localhost:${PORT}/api/guardz/*`);
  console.log(`📊 Download stats available at http://localhost:${PORT}/reports.html`);
  
  // Set up cron job for daily reports (runs at 9:00 AM UTC every day)
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('🕘 Running scheduled daily report generation...');
      await npmStatsService.generateDailyReport();
      console.log('✅ Scheduled daily report generated successfully');
    } catch (error) {
      console.error('❌ Error in scheduled daily report generation:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });
  
  console.log('⏰ Daily report cron job scheduled for 9:00 AM UTC');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  // Cleanup temp directory
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temp directory:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  // Cleanup temp directory
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temp directory:', error);
  }
  process.exit(0);
}); 