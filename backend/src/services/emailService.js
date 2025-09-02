import nodemailer from 'nodemailer';
import { getEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';

const env = getEnv();

export class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.fromEmail = env.EMAIL_FROM || 'noreply@diy-humanoid-configurator.com';
    this.appName = 'DIY Humanoid Configurator';
  }

  createTransporter() {
    // For development, use Gmail or other SMTP service
    // For production, use services like SendGrid, AWS SES, etc.
    return nodemailer.createTransport({
      host: env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
      }
    });
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: `"${this.appName}" <${this.fromEmail}>`,
        to,
        subject: `${this.appName} - ${subject}`,
        html,
        text: text || this.htmlToText(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', { 
        to, 
        subject,
        messageId: info.messageId 
      });

      return info;
    } catch (error) {
      logger.error('Failed to send email', { 
        to, 
        subject,
        error: error.message 
      });
      throw error;
    }
  }

  async sendWelcomeEmail(user, verificationToken) {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ${this.appName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #2563eb; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Willkommen bei ${this.appName}!</h1>
          </div>
          <div class="content">
            <h2>Hallo ${user.name || 'Lieber Nutzer'},</h2>
            <p>
              Vielen Dank für Ihre Registrierung bei ${this.appName}! 
              Wir freuen uns, Sie in unserer Community begrüßen zu dürfen.
            </p>
            <p>
              Um Ihr Konto zu aktivieren, klicken Sie bitte auf den folgenden Button:
            </p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">E-Mail verifizieren</a>
            </div>
            <p>
              Alternativ können Sie diesen Link in Ihren Browser kopieren:<br>
              <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            <p>
              <strong>Wichtig:</strong> Dieser Verifizierungslink ist nur 24 Stunden gültig.
            </p>
            <p>
              Mit ${this.appName} können Sie:
              <ul>
                <li>Humanoide Roboter konfigurieren und personalisieren</li>
                <li>Detaillierte Montageanleitungen erhalten</li>
                <li>Ihre Bestellungen verfolgen</li>
                <li>Zugang zu exklusivem Support erhalten</li>
              </ul>
            </p>
          </div>
          <div class="footer">
            <p>
              Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.<br>
              © 2024 ${this.appName}. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Willkommen! Bitte verifizieren Sie Ihre E-Mail',
      html
    });
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Passwort zurücksetzen</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #dc2626; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { 
            background: #fef2f2; 
            border: 1px solid #fecaca; 
            color: #dc2626; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Passwort zurücksetzen</h1>
          </div>
          <div class="content">
            <h2>Passwort-Reset angefordert</h2>
            <p>
              Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für ${this.appName} gestellt.
            </p>
            <p>
              Klicken Sie auf den folgenden Button, um ein neues Passwort zu erstellen:
            </p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
            </div>
            <p>
              Alternativ können Sie diesen Link in Ihren Browser kopieren:<br>
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
            <div class="warning">
              <strong>⚠️ Sicherheitshinweis:</strong><br>
              • Dieser Link ist nur 1 Stunde gültig<br>
              • Falls Sie kein neues Passwort angefordert haben, ignorieren Sie diese E-Mail<br>
              • Ihr aktuelles Passwort bleibt bis zum Zurücksetzen gültig
            </div>
          </div>
          <div class="footer">
            <p>
              Falls Sie diese E-Mail nicht angefordert haben, können Sie sie sicher ignorieren.<br>
              © 2024 ${this.appName}. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Passwort zurücksetzen - Handlung erforderlich',
      html
    });
  }

  async sendEmailVerificationEmail(email, verificationToken) {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>E-Mail verifizieren</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #16a34a; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>E-Mail Verifizierung</h1>
          </div>
          <div class="content">
            <h2>Bitte verifizieren Sie Ihre E-Mail</h2>
            <p>
              Um Ihr ${this.appName} Konto vollständig zu aktivieren, 
              müssen Sie Ihre E-Mail-Adresse verifizieren.
            </p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">E-Mail verifizieren</a>
            </div>
            <p>
              Alternativ können Sie diesen Link in Ihren Browser kopieren:<br>
              <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            <p>
              <strong>Hinweis:</strong> Dieser Verifizierungslink ist 24 Stunden gültig.
            </p>
          </div>
          <div class="footer">
            <p>
              Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.<br>
              © 2024 ${this.appName}. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'E-Mail verifizieren - Konto aktivieren',
      html
    });
  }

  async sendLoginNotificationEmail(user, loginInfo) {
    const { ipAddress, userAgent, timestamp } = loginInfo;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Neuer Login erkannt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .info-box { 
            background: #e0f2fe; 
            border: 1px solid #b3e5fc; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Login-Benachrichtigung</h1>
          </div>
          <div class="content">
            <h2>Hallo ${user.name || 'Lieber Nutzer'},</h2>
            <p>
              Wir haben einen neuen Login in Ihr ${this.appName} Konto festgestellt.
            </p>
            <div class="info-box">
              <strong>Login-Details:</strong><br>
              📅 Zeit: ${new Date(timestamp).toLocaleString('de-DE')}<br>
              🌐 IP-Adresse: ${ipAddress}<br>
              💻 Browser: ${userAgent}
            </div>
            <p>
              Falls Sie sich gerade angemeldet haben, können Sie diese E-Mail ignorieren.
            </p>
            <p>
              <strong>Falls Sie sich nicht angemeldet haben:</strong><br>
              1. Ändern Sie sofort Ihr Passwort<br>
              2. Prüfen Sie Ihre Konto-Aktivitäten<br>
              3. Kontaktieren Sie unseren Support
            </p>
          </div>
          <div class="footer">
            <p>
              Diese E-Mail wurde automatisch gesendet.<br>
              © 2024 ${this.appName}. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Sicherheitshinweis: Neuer Login erkannt',
      html
    });
  }

  // Utility method to convert HTML to plain text
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error: error.message });
      return false;
    }
  }
}

export const emailService = new EmailService();