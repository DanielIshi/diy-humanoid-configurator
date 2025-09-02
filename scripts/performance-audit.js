#!/usr/bin/env node

/**
 * Performance Audit Script für DIY Humanoid Configurator
 * 
 * Führt automatische Performance-Tests durch und generiert Reports
 * 
 * Usage:
 *   node scripts/performance-audit.js [options]
 * 
 * Options:
 *   --environment  production|staging|development (default: development)
 *   --output       Output directory (default: ./performance-reports)
 *   --lighthouse   Run Lighthouse audit (default: true)
 *   --bundle       Analyze bundle size (default: true)
 *   --verbose      Verbose logging (default: false)
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class PerformanceAuditor {
  constructor(options = {}) {
    this.options = {
      environment: options.environment || 'development',
      output: options.output || join(projectRoot, 'performance-reports'),
      lighthouse: options.lighthouse !== false,
      bundle: options.bundle !== false,
      verbose: options.verbose || false
    };
    
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!existsSync(this.options.output)) {
      mkdirSync(this.options.output, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level.toUpperCase().padEnd(5);
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (process.stderr) {
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async buildProject() {
    this.log('Building project for performance audit...');
    
    try {
      // Build Frontend
      await this.runCommand('npm', ['run', 'build'], {
        cwd: join(projectRoot, 'frontend')
      });
      
      this.log('Frontend build completed');
      
      // Start backend if not running
      this.log('Starting backend server...');
      const backendProcess = spawn('npm', ['start'], {
        cwd: join(projectRoot, 'backend'),
        detached: true,
        stdio: 'ignore'
      });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return backendProcess;
    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async analyzeBundleSize() {
    if (!this.options.bundle) return null;
    
    this.log('Analyzing bundle size...');
    
    try {
      const { stdout } = await this.runCommand('npm', ['run', 'build:stats'], {
        cwd: join(projectRoot, 'frontend')
      });
      
      // Parse bundle analyzer output
      const bundleSizeRegex = /Total size: ([\d.]+)\s*(KB|MB)/;
      const match = stdout.match(bundleSizeRegex);
      
      const analysis = {
        timestamp: new Date().toISOString(),
        totalSize: match ? `${match[1]} ${match[2]}` : 'Unknown',
        details: stdout
      };
      
      const outputFile = join(this.options.output, `bundle-analysis-${this.timestamp}.json`);
      writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
      
      this.log(`Bundle analysis saved to: ${outputFile}`);
      return analysis;
    } catch (error) {
      this.log(`Bundle analysis failed: ${error.message}`, 'error');
      return null;
    }
  }

  async runLighthouseAudit() {
    if (!this.options.lighthouse) return null;
    
    this.log('Running Lighthouse audit...');
    
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    
    try {
      const options = {
        logLevel: this.options.verbose ? 'info' : 'error',
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
        port: chrome.port
      };
      
      const url = `http://localhost:${this.options.environment === 'production' ? 4173 : 5173}`;
      const runnerResult = await lighthouse(url, options);
      
      if (!runnerResult) {
        throw new Error('Lighthouse audit failed');
      }
      
      const { lhr } = runnerResult;
      const report = {
        timestamp: new Date().toISOString(),
        url: lhr.finalUrl,
        scores: {
          performance: Math.round(lhr.categories.performance.score * 100),
          accessibility: Math.round(lhr.categories.accessibility.score * 100),
          bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
          seo: Math.round(lhr.categories.seo.score * 100),
          pwa: Math.round(lhr.categories.pwa.score * 100)
        },
        metrics: {
          firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
          timeToInteractive: lhr.audits['interactive'].numericValue,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
          totalBlockingTime: lhr.audits['total-blocking-time'].numericValue
        },
        opportunities: lhr.audits['opportunities'] || {},
        diagnostics: lhr.audits['diagnostics'] || {}
      };
      
      // Save detailed report
      const detailedOutputFile = join(this.options.output, `lighthouse-detailed-${this.timestamp}.json`);
      writeFileSync(detailedOutputFile, JSON.stringify(lhr, null, 2));
      
      // Save summary report  
      const summaryOutputFile = join(this.options.output, `lighthouse-summary-${this.timestamp}.json`);
      writeFileSync(summaryOutputFile, JSON.stringify(report, null, 2));
      
      this.log(`Lighthouse audit completed:`);
      this.log(`  Performance: ${report.scores.performance}/100`);
      this.log(`  Accessibility: ${report.scores.accessibility}/100`);
      this.log(`  Best Practices: ${report.scores.bestPractices}/100`);
      this.log(`  SEO: ${report.scores.seo}/100`);
      this.log(`  PWA: ${report.scores.pwa}/100`);
      
      this.log(`Detailed report saved to: ${detailedOutputFile}`);
      this.log(`Summary report saved to: ${summaryOutputFile}`);
      
      return report;
    } catch (error) {
      this.log(`Lighthouse audit failed: ${error.message}`, 'error');
      return null;
    } finally {
      await chrome.kill();
    }
  }

  async checkPerformanceBudget(lighthouseReport) {
    this.log('Checking performance budget...');
    
    const budget = {
      performance: 90,
      firstContentfulPaint: 1500,
      largestContentfulPaint: 2500,
      timeToInteractive: 3500,
      cumulativeLayoutShift: 0.1
    };
    
    const violations = [];
    
    if (lighthouseReport) {
      if (lighthouseReport.scores.performance < budget.performance) {
        violations.push({
          metric: 'Performance Score',
          actual: lighthouseReport.scores.performance,
          budget: budget.performance,
          severity: 'high'
        });
      }
      
      if (lighthouseReport.metrics.firstContentfulPaint > budget.firstContentfulPaint) {
        violations.push({
          metric: 'First Contentful Paint',
          actual: Math.round(lighthouseReport.metrics.firstContentfulPaint),
          budget: budget.firstContentfulPaint,
          severity: 'high'
        });
      }
      
      if (lighthouseReport.metrics.largestContentfulPaint > budget.largestContentfulPaint) {
        violations.push({
          metric: 'Largest Contentful Paint',
          actual: Math.round(lighthouseReport.metrics.largestContentfulPaint),
          budget: budget.largestContentfulPaint,
          severity: 'high'
        });
      }
    }
    
    const budgetReport = {
      timestamp: new Date().toISOString(),
      budget,
      violations,
      status: violations.length === 0 ? 'passed' : 'failed'
    };
    
    const outputFile = join(this.options.output, `budget-check-${this.timestamp}.json`);
    writeFileSync(outputFile, JSON.stringify(budgetReport, null, 2));
    
    if (violations.length > 0) {
      this.log(`Performance budget violations found:`, 'warn');
      violations.forEach(violation => {
        this.log(`  ${violation.metric}: ${violation.actual} (budget: ${violation.budget})`, 'warn');
      });
    } else {
      this.log('All performance budgets passed! ✅');
    }
    
    return budgetReport;
  }

  async generateSummaryReport(results) {
    this.log('Generating summary report...');
    
    const summary = {
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      results: {
        bundleAnalysis: results.bundleAnalysis ? 'completed' : 'skipped',
        lighthouseAudit: results.lighthouseAudit ? 'completed' : 'failed',
        budgetCheck: results.budgetCheck ? results.budgetCheck.status : 'failed'
      },
      lighthouse: results.lighthouseAudit ? {
        scores: results.lighthouseAudit.scores,
        metrics: results.lighthouseAudit.metrics
      } : null,
      budget: results.budgetCheck || null,
      recommendations: this.generateRecommendations(results)
    };
    
    const outputFile = join(this.options.output, `performance-summary-${this.timestamp}.json`);
    writeFileSync(outputFile, JSON.stringify(summary, null, 2));
    
    this.log(`Summary report saved to: ${outputFile}`);
    return summary;
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    if (results.lighthouseAudit) {
      const scores = results.lighthouseAudit.scores;
      
      if (scores.performance < 90) {
        recommendations.push({
          category: 'Performance',
          priority: 'high',
          message: 'Performance score below 90. Consider implementing code splitting and caching.',
          score: scores.performance
        });
      }
      
      if (results.lighthouseAudit.metrics.firstContentfulPaint > 1500) {
        recommendations.push({
          category: 'Loading',
          priority: 'high',
          message: 'First Contentful Paint too slow. Optimize critical rendering path.',
          value: Math.round(results.lighthouseAudit.metrics.firstContentfulPaint)
        });
      }
      
      if (scores.pwa < 80) {
        recommendations.push({
          category: 'PWA',
          priority: 'medium',
          message: 'PWA score could be improved. Implement service worker and manifest.',
          score: scores.pwa
        });
      }
    }
    
    if (results.budgetCheck && results.budgetCheck.violations.length > 0) {
      recommendations.push({
        category: 'Budget',
        priority: 'high',
        message: `${results.budgetCheck.violations.length} performance budget violations found.`,
        violations: results.budgetCheck.violations.length
      });
    }
    
    return recommendations;
  }

  async run() {
    this.log(`Starting performance audit (${this.options.environment})...`);
    
    const results = {};
    
    try {
      // Build project
      const serverProcess = await this.buildProject();
      
      // Run analyses
      results.bundleAnalysis = await this.analyzeBundleSize();
      results.lighthouseAudit = await this.runLighthouseAudit();
      results.budgetCheck = await this.checkPerformanceBudget(results.lighthouseAudit);
      
      // Generate summary
      const summary = await this.generateSummaryReport(results);
      
      // Cleanup
      if (serverProcess) {
        process.kill(-serverProcess.pid);
      }
      
      this.log('Performance audit completed! 🎉');
      return summary;
      
    } catch (error) {
      this.log(`Performance audit failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI execution
if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'verbose') {
      options[key] = true;
      i -= 1; // No value for boolean flags
    } else {
      options[key] = value;
    }
  }
  
  const auditor = new PerformanceAuditor(options);
  auditor.run().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

export default PerformanceAuditor;