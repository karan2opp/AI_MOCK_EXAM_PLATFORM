import { Resend } from 'resend';
import 'dotenv/config';

// Initialize Resend with the API key from environment variables
export const resend = new Resend(process.env.EMAIL_API_KEY);

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const url = `${process.env.CLIENT_URL}/api/auth/verifyEmail/${token}`;

    const response = await resend.emails.send({
      from: 'alhnkar <noreply@karanop.in>',
      to: email,
      subject: 'Verify your email',
      html: `<h2>Welcome!</h2><p>Click <a href="${url}">here</a> to verify your email.</p>`,
    });

    console.log("Verification email sent:", response);
    return response;
  } catch (error) {
    console.log("Error sending verification email:", error);
    throw error;
  }
};

export const sendResetPasswordEmail = async (email: string, token: string) => {
  try {
    const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const response = await resend.emails.send({
      from: 'alhnkar <noreply@karanop.in>',
      to: email, // later make this dynamic
      subject: 'Reset Your Password',
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>Click <a href="${url}">here</a> to reset your password.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    console.log("Reset password email sent:", response);
    return response;
  } catch (error) {
    console.log("Error sending reset password email:", error);
    throw error;
  }
};
