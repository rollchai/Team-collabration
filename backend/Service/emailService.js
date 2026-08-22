import nodemailer from 'nodemailer';
import axios from 'axios';

/**
 * Send an email using Resend API (if API key is present) or nodemailer SMTP,
 * or fallback to console log during development.
 * @param {Object} options Options containing email, subject, and message.
 */
const sendEmail = async (options) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.FROM_EMAIL || smtpEmail || 'onboarding@resend.dev';
  const fromName = process.env.FROM_NAME || 'CollabSaas';

  // 1. Use Resend HTTP API if key is present (bypasses SMTP port blocking on Render)
  if (resendApiKey) {
    try {
      console.log('Sending email via Resend API...');
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: `"${fromName}" <${fromEmail}>`,
          to: [options.email],
          subject: options.subject,
          text: options.message,
          html: options.message.replace(/\n/g, '<br>'),
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Message sent via Resend:', response.data.id);
      return { success: true, info: response.data };
    } catch (error) {
      console.error('Resend API Error:', error.response?.data || error.message);
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }
  }

  // 2. Fallback to console log if SMTP settings are not fully configured
  if (!smtpHost || !smtpPort || !smtpEmail || !smtpPassword) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP credentials and settings are missing in production environment.');
    }
    console.log('\n==================================================');
    console.log('📧 EMAIL SIMULATION (SMTP/Resend not configured in .env)');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Content:');
    console.log(options.message);
    console.log('==================================================\n');
    return { success: true, simulated: true };
  }

  // 3. Use standard SMTP
  console.log('Sending email via SMTP...');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // Use SSL/TLS for port 465
    auth: {
      user: smtpEmail,
      pass: smtpPassword,
    },
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.message.replace(/\n/g, '<br>'),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Message sent: ${info.messageId}`);
  return { success: true, info };
};

export default sendEmail;
