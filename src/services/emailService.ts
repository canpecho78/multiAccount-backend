import nodemailer from "nodemailer";
import { env } from "../config/env";

/**
 * EmailService - Servicio para envío de emails
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Inicializar transporter de nodemailer
   */
  private async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // Verificar que las credenciales SMTP estén configuradas
    if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass) {
      console.warn("⚠️ SMTP no configurado. Los emails no se enviarán.");
      return null;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure, // true para 465, false para otros puertos
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });

      // Verificar conexión
      await this.transporter.verify();
      console.log("✅ SMTP configurado correctamente");

      return this.transporter;
    } catch (error) {
      console.error("❌ Error configurando SMTP:", error);
      this.transporter = null;
      return null;
    }
  }

  /**
   * Enviar email de reseteo de contraseña
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName?: string
  ): Promise<boolean> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      console.warn(`⚠️ No se pudo enviar email a ${to} (SMTP no configurado)`);
      return false;
    }

    try {
      const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;
      const expiryMinutes = 60; // 1 hora

      const mailOptions = {
        from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
        to,
        subject: "Resetear Contraseña - WhatsApp Multi-Sesiones",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .header h1 {
                color: #25D366;
                margin: 0;
              }
              .content {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #25D366;
                color: white !important;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
              }
              .button:hover {
                background-color: #128C7E;
              }
              .token-box {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 5px;
                font-family: monospace;
                word-break: break-all;
                margin: 15px 0;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #666;
                margin-top: 20px;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 10px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Resetear Contraseña</h1>
              </div>
              
              <div class="content">
                <p>Hola${userName ? ` ${userName}` : ""},</p>
                
                <p>Hemos recibido una solicitud para resetear la contraseña de tu cuenta.</p>
                
                <p>Haz clic en el siguiente botón para resetear tu contraseña:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Resetear Contraseña</a>
                </div>
                
                <p>O copia y pega el siguiente enlace en tu navegador:</p>
                <div class="token-box">${resetUrl}</div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Este enlace expira en <strong>${expiryMinutes} minutos</strong></li>
                    <li>Solo puede ser usado una vez</li>
                    <li>Si no solicitaste este cambio, ignora este email</li>
                  </ul>
                </div>
              </div>
              
              <div class="footer">
                <p>Este es un email automático, por favor no respondas.</p>
                <p>&copy; ${new Date().getFullYear()} WhatsApp Multi-Sesiones. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hola${userName ? ` ${userName}` : ""},

Hemos recibido una solicitud para resetear la contraseña de tu cuenta.

Para resetear tu contraseña, visita el siguiente enlace:
${resetUrl}

Este enlace expira en ${expiryMinutes} minutos y solo puede ser usado una vez.

Si no solicitaste este cambio, ignora este email.

---
Este es un email automático, por favor no respondas.
© ${new Date().getFullYear()} WhatsApp Multi-Sesiones
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de reseteo enviado a ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Error enviando email a ${to}:`, error);
      return false;
    }
  }

  /**
   * Enviar email de confirmación de cambio de contraseña
   */
  async sendPasswordChangedEmail(
    to: string,
    userName?: string
  ): Promise<boolean> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return false;
    }

    try {
      const mailOptions = {
        from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
        to,
        subject: "Contraseña Actualizada - WhatsApp Multi-Sesiones",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
              }
              .success {
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="color: #25D366;">✅ Contraseña Actualizada</h1>
              
              <p>Hola${userName ? ` ${userName}` : ""},</p>
              
              <div class="success">
                <strong>Tu contraseña ha sido actualizada exitosamente.</strong>
              </div>
              
              <p>Si no realizaste este cambio, contacta inmediatamente con el administrador.</p>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este es un email automático, por favor no respondas.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
Hola${userName ? ` ${userName}` : ""},

Tu contraseña ha sido actualizada exitosamente.

Si no realizaste este cambio, contacta inmediatamente con el administrador.

---
Este es un email automático, por favor no respondas.
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de confirmación enviado a ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Error enviando email a ${to}:`, error);
      return false;
    }
  }

  /**
   * Enviar email con contraseña temporal (admin reset)
   */
  async sendTemporaryPasswordEmail(
    to: string,
    temporaryPassword: string,
    userName?: string
  ): Promise<boolean> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return false;
    }

    try {
      const mailOptions = {
        from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
        to,
        subject: "Contraseña Temporal - WhatsApp Multi-Sesiones",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
              }
              .password-box {
                background-color: #fff3cd;
                border: 2px solid #ffc107;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
              }
              .password {
                font-size: 24px;
                font-weight: bold;
                font-family: monospace;
                color: #856404;
                letter-spacing: 2px;
              }
              .warning {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 10px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="color: #ffc107;">🔑 Contraseña Temporal</h1>
              
              <p>Hola${userName ? ` ${userName}` : ""},</p>
              
              <p>El administrador ha reseteado tu contraseña. Tu nueva contraseña temporal es:</p>
              
              <div class="password-box">
                <div class="password">${temporaryPassword}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Esta es una contraseña temporal</li>
                  <li>Debes cambiarla inmediatamente después de iniciar sesión</li>
                  <li>No compartas esta contraseña con nadie</li>
                </ul>
              </div>
              
              <p>Para cambiar tu contraseña, inicia sesión y ve a tu perfil.</p>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este es un email automático, por favor no respondas.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
Hola${userName ? ` ${userName}` : ""},

El administrador ha reseteado tu contraseña. Tu nueva contraseña temporal es:

${temporaryPassword}

IMPORTANTE:
- Esta es una contraseña temporal
- Debes cambiarla inmediatamente después de iniciar sesión
- No compartas esta contraseña con nadie

Para cambiar tu contraseña, inicia sesión y ve a tu perfil.

---
Este es un email automático, por favor no respondas.
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de contraseña temporal enviado a ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Error enviando email a ${to}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
