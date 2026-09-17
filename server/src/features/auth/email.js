import { env } from '../../config/env.js';

/**
 * Delivers the password-reset link.
 *
 * This is the seam where a real provider goes (SendGrid, Resend, SMTP).
 * Until then it logs to the console, which is enough for internal staff
 * accounts and the client demo. Swapping the body of this function is the
 * only change needed to send real email.
 */
export const sendResetEmail = async ({ to, resetUrl }) => {
  console.log('─'.repeat(72));
  console.log('[email] Password reset requested');
  console.log(`[email] To:   ${to}`);
  console.log(`[email] Link: ${resetUrl}`);
  console.log(`[email] Expires in ${env().resetTokenTtlMinutes} minutes.`);
  console.log('─'.repeat(72));

  return { delivered: true };
};
