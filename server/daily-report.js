#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

class NpmDailyReporter {
  constructor() {
    this.packages = ['guardz', 'guardz-generator'];
    this.reportDir = './reports';
  }

  async getDailyDownloads(packageName, date = null) {
    const endpoint = date 
      ? `https://api.npmjs.org/downloads/point/${date}/${date}/${packageName}`
      : `https://api.npmjs.org/downloads/point/last-day/${packageName}`;
    
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching data for ${packageName}:`, error.message);
      return { downloads: 0, error: error.message };
    }
  }

  async getWeeklyDownloads(packageName) {
    try {
      const response = await fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching weekly data for ${packageName}:`, error.message);
      return { downloads: 0, error: error.message };
    }
  }

  async getMonthlyDownloads(packageName) {
    try {
      const response = await fetch(`https://api.npmjs.org/downloads/point/last-month/${packageName}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching monthly data for ${packageName}:`, error.message);
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

    console.log('📊 Generating daily npm download report...\n');

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

      console.log(`   ✅ Daily: ${daily.downloads || 0} downloads`);
      console.log(`   ✅ Weekly: ${weekly.downloads || 0} downloads`);
      console.log(`   ✅ Monthly: ${monthly.downloads || 0} downloads`);
    }

    // Create reports directory if it doesn't exist
    await fs.mkdir(this.reportDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(this.reportDir, `daily-report-${today}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = path.join(this.reportDir, `daily-report-${today}.md`);
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(markdownPath, markdown);

    console.log(`\n📈 Report generated:`);
    console.log(`   📄 JSON: ${jsonPath}`);
    console.log(`   📄 Markdown: ${markdownPath}`);

    return report;
  }

  generateMarkdownReport(report) {
    let markdown = `# 📊 NPM Daily Download Report - ${report.date}\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    markdown += `## 📦 Package Statistics\n\n`;

    for (const [packageName, stats] of Object.entries(report.packages)) {
      markdown += `### ${packageName}\n\n`;
      markdown += `| Period | Downloads |\n`;
      markdown += `|--------|-----------|\n`;
      markdown += `| Today | ${stats.daily} |\n`;
      markdown += `| This Week | ${stats.weekly} |\n`;
      markdown += `| This Month | ${stats.monthly} |\n\n`;

      if (stats.dailyError || stats.weeklyError || stats.monthlyError) {
        markdown += `**Errors:**\n`;
        if (stats.dailyError) markdown += `- Daily: ${stats.dailyError}\n`;
        if (stats.weeklyError) markdown += `- Weekly: ${stats.weeklyError}\n`;
        if (stats.monthlyError) markdown += `- Monthly: ${stats.monthlyError}\n\n`;
      }
    }

    markdown += `## 📈 Summary\n\n`;
    const totalDaily = Object.values(report.packages).reduce((sum, stats) => sum + stats.daily, 0);
    const totalWeekly = Object.values(report.packages).reduce((sum, stats) => sum + stats.weekly, 0);
    const totalMonthly = Object.values(report.packages).reduce((sum, stats) => sum + stats.monthly, 0);

    markdown += `- **Total Daily Downloads:** ${totalDaily}\n`;
    markdown += `- **Total Weekly Downloads:** ${totalWeekly}\n`;
    markdown += `- **Total Monthly Downloads:** ${totalMonthly}\n\n`;

    return markdown;
  }

  async scheduleDailyReport() {
    console.log('⏰ Setting up daily report schedule...');
    
    // This would typically be done with cron jobs or GitHub Actions
    const cronJob = `0 9 * * * cd /path/to/your/project && node daily-report.js`;
    
    console.log('To schedule daily reports, add this cron job:');
    console.log(cronJob);
    console.log('\nOr use GitHub Actions for automated daily reports.');
  }
}

// Run the report
async function main() {
  const reporter = new NpmDailyReporter();
  
  if (process.argv.includes('--schedule')) {
    await reporter.scheduleDailyReport();
  } else {
    await reporter.generateDailyReport();
  }
}

main().catch(console.error); 