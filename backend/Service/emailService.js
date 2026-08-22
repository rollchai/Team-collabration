import nodemailer from 'nodemailer';

/**
 * Send an email using nodemailer or fallback to console log during development.
 * @param {Object} options Options containing email, subject, and message.
 */
const sendEmail = async (options) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;

  // Fallback to console log if SMTP settings are not fully configured
  if (!smtpHost || !smtpPort || !smtpEmail || !smtpPassword) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP credentials and settings are missing in production environment.');
    }
    console.log('\n==================================================');
    console.log('📧 EMAIL SIMULATION (SMTP not configured in .env)');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Content:');
    console.log(options.message);
    console.log('==================================================\n');
    return { success: true, simulated: true };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // Use SSL/TLS for port 465
    auth: {
      user: smtpEmail,
      pass: smtpPassword,
    },
  });

  // Define message options
  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'CollabSaas'}" <${process.env.FROM_EMAIL || smtpEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.message.replace(/\n/g, '<br>'), // Simple fallback formatting for HTML email clients
  };

  // Send the email
  const info = await transporter.sendMail(mailOptions);
  console.log(`Message sent: ${info.messageId}`);
  return { success: true, info };
};

export default sendEmail;
