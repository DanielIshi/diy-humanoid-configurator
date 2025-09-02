#!/usr/bin/env node

/**
 * Email Service Test Script
 * 
 * This script tests the email service configuration and sends test emails.
 * Run with: node scripts/test-email.js
 */

import { emailService } from '../src/services/emailService.js';
import { logger } from '../src/lib/logger.js';

async function testEmailService() {
  logger.info('Starting email service test...');

  try {
    // Test 1: Email connection
    logger.info('Testing email service connection...');
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest) {
      logger.error('Email service connection failed!');
      logger.info('Please check your email configuration:');
      logger.info('- EMAIL_HOST (default: smtp.gmail.com)');
      logger.info('- EMAIL_PORT (default: 587)');
      logger.info('- EMAIL_USER (your email address)');
      logger.info('- EMAIL_PASS (your app password)');
      process.exit(1);
    }

    logger.info('✓ Email service connection successful');

    // Test 2: Welcome email
    logger.info('Testing welcome email...');
    const testUser = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      name: 'Test User'
    };
    
    const testToken = 'test-verification-token-123';
    
    try {
      await emailService.sendWelcomeEmail(testUser, testToken);
      logger.info('✓ Welcome email sent successfully');
    } catch (error) {
      logger.error('✗ Welcome email failed:', error.message);
    }

    // Test 3: Password reset email
    logger.info('Testing password reset email...');
    const resetToken = 'test-reset-token-123';
    
    try {
      await emailService.sendPasswordResetEmail(testUser.email, resetToken);
      logger.info('✓ Password reset email sent successfully');
    } catch (error) {
      logger.error('✗ Password reset email failed:', error.message);
    }

    // Test 4: Email verification
    logger.info('Testing email verification email...');
    const verificationToken = 'test-verify-token-123';
    
    try {
      await emailService.sendEmailVerificationEmail(testUser.email, verificationToken);
      logger.info('✓ Email verification sent successfully');
    } catch (error) {
      logger.error('✗ Email verification failed:', error.message);
    }

    // Test 5: Login notification
    logger.info('Testing login notification email...');
    const loginInfo = {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      timestamp: new Date()
    };
    
    try {
      await emailService.sendLoginNotificationEmail(testUser, loginInfo);
      logger.info('✓ Login notification sent successfully');
    } catch (error) {
      logger.error('✗ Login notification failed:', error.message);
    }

    logger.info('Email service test completed!');
    
    if (process.env.TEST_EMAIL) {
      logger.info(`Check your inbox at ${process.env.TEST_EMAIL} for test emails.`);
    } else {
      logger.info('Set TEST_EMAIL environment variable to receive actual test emails.');
    }

  } catch (error) {
    logger.error('Email service test failed:', error.message);
    process.exit(1);
  }
}

// Configuration check
function checkConfiguration() {
  const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:');
    missingVars.forEach(varName => logger.error(`- ${varName}`));
    logger.info('\nPlease set these variables in your .env file or environment.');
    logger.info('\nExample configuration for Gmail:');
    logger.info('EMAIL_HOST=smtp.gmail.com');
    logger.info('EMAIL_PORT=587');
    logger.info('EMAIL_USER=your-email@gmail.com');
    logger.info('EMAIL_PASS=your-app-password');
    logger.info('EMAIL_FROM=noreply@your-domain.com');
    logger.info('\nFor Gmail App Passwords: https://support.google.com/accounts/answer/185833');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Email Service Test Script

Usage: node scripts/test-email.js [options]

Options:
  --help, -h     Show this help message
  --config-check Check email configuration only

Environment Variables:
  EMAIL_HOST     SMTP server hostname (default: smtp.gmail.com)
  EMAIL_PORT     SMTP server port (default: 587)
  EMAIL_USER     Email username/address
  EMAIL_PASS     Email password (app password for Gmail)
  EMAIL_FROM     From email address
  TEST_EMAIL     Email address to send test emails to
  FRONTEND_URL   Frontend URL for email links

Examples:
  # Test with Gmail
  EMAIL_HOST=smtp.gmail.com EMAIL_USER=your@gmail.com EMAIL_PASS=app-pass node scripts/test-email.js
  
  # Test with custom SMTP
  EMAIL_HOST=mail.your-domain.com EMAIL_PORT=587 EMAIL_USER=noreply@your-domain.com EMAIL_PASS=password node scripts/test-email.js
`);
  process.exit(0);
}

if (args.includes('--config-check')) {
  logger.info('Checking email configuration...');
  checkConfiguration();
  logger.info('✓ Email configuration looks good!');
  process.exit(0);
}

// Run the test
checkConfiguration();
testEmailService().catch(error => {
  logger.error('Unhandled error in email test:', error);
  process.exit(1);
});