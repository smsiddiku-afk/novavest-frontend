import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

// In-memory OTP storage
const otpStore = new Map<string, OtpRecord>();

// Clean up expired OTPs periodically (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 2 * 60 * 1000);

/**
 * Creates nodemailer transporter based on environment variables
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : '');
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Generates a branded HTML template for NVT Energy OTP email
 */
function generateOtpHtml(code: string, lang: 'bn' | 'en' = 'bn'): string {
  const isBn = lang === 'bn';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NVT Energy Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #03140e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #03140e; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" max-width="500" style="max-width: 500px; background: linear-gradient(135deg, #063124 0%, #041f17 100%); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);"></td>
          </tr>

          <!-- Header / Brand -->
          <tr>
            <td align="center" style="padding: 32px 24px 16px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Tech Flame Icon Container -->
                    <div style="display: inline-block; width: 56px; height: 56px; border-radius: 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); text-align: center; line-height: 56px; font-size: 28px;">
                      ⚡
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.15em; color: #34d399; text-transform: uppercase;">NVT ENERGY</h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.1em; color: #a7f3d0; text-transform: uppercase;">Nova Terra Power Grid</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 12px 32px 24px 32px; text-align: center;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                ${isBn ? 'ইমেইল যাচাইকরণ ওটিপি కోড' : 'Email Verification Code'}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
                ${isBn 
                  ? 'আপনার NVT Energy অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে নিচের ৬ ডিজিটের যাচাইকরণ কোডটি ব্যবহার করুন:' 
                  : 'Use the following 6-digit verification code to complete your NVT Energy registration:'}
              </p>

              <!-- OTP Code Display Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: #021a12; border: 2px dashed #10b981; border-radius: 14px; padding: 16px 28px; box-shadow: 0 0 25px rgba(16, 185, 129, 0.15);">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #6ee7b7; display: block; text-indent: 10px;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Warning -->
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 10px 14px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #fca5a5; font-weight: 500;">
                  ⏱️ ${isBn ? 'এই ওটিপি কোডটির মেয়াদ মাত্র ৫ মিনিট।' : 'This verification code is valid for 5 minutes only.'}
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                ${isBn 
                  ? 'আপনি যদি এই অনুরোধটি না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন। কোডটি কারো সাথে শেয়ার করবেন না।' 
                  : 'If you did not request this verification code, please ignore this email. Never share this code with anyone.'}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #02120c; border-top: 1px solid rgba(52, 211, 153, 0.15); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} NVT Nova Terra Energy. All rights reserved.
              </p>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #334155;">
                Automated Security Notification • Please do not reply to this email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends real OTP email or falls back to dev mode if SMTP is not configured yet
 */
export async function sendOtpEmail(
  rawEmail: string,
  lang: 'bn' | 'en' = 'bn'
): Promise<{
  success: boolean;
  message: string;
  devMode?: boolean;
  code?: string;
  expiresInSeconds?: number;
}> {
  const email = (rawEmail || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      message: lang === 'bn' ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Invalid email address provided.',
    };
  }

  // Check rate limit: minimum 50 seconds cooldown between sends for same email
  const existing = otpStore.get(email);
  const now = Date.now();
  if (existing && now - existing.createdAt < 50 * 1000) {
    const waitSeconds = Math.ceil((50 * 1000 - (now - existing.createdAt)) / 1000);
    return {
      success: false,
      message:
        lang === 'bn'
          ? `দয়া করে ${waitSeconds} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।`
          : `Please wait ${waitSeconds} seconds before requesting a new code.`,
    };
  }

  // Generate cryptographically secure 6-digit numeric OTP
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresInMs = 5 * 60 * 1000; // 5 minutes validity

  // Store in memory
  otpStore.set(email, {
    code,
    expiresAt: now + expiresInMs,
    attempts: 0,
    createdAt: now,
  });

  const transporter = createTransporter();

  // If SMTP credentials exist, send genuine real email
  if (transporter) {
    try {
      const fromAddress =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        process.env.GMAIL_USER ||
        'no-reply@nvtenergy.com';

      const subject =
        lang === 'bn'
          ? `[NVT Energy] আপনার ভেরিফিকেশন কোড: ${code}`
          : `[NVT Energy] Your Verification Code: ${code}`;

      await transporter.sendMail({
        from: `"NVT Energy" <${fromAddress}>`,
        to: email,
        subject,
        html: generateOtpHtml(code, lang),
        text: `Your NVT Energy verification code is: ${code}. Valid for 5 minutes.`,
      });

      console.log(`[EmailOTP] Real email OTP successfully sent to: ${email}`);
      return {
        success: true,
        message:
          lang === 'bn'
            ? 'আপনার ইমেইলে ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে।'
            : 'A 6-digit verification code has been sent to your email.',
        expiresInSeconds: 300,
      };
    } catch (sendErr: any) {
      console.error(`[EmailOTP] Error sending real email to ${email}:`, sendErr?.message || sendErr);
      // Fallback response with code so the user is not locked out if SMTP provider has temporary network failure
      return {
        success: true,
        devMode: true,
        code,
        message:
          lang === 'bn'
            ? `ইমেইল গেটওয়েতে সমস্যা দেখা দেওয়ায় কোডটি সরাসরি প্রদান করা হলো: ${code}`
            : `Email delivery encountered an issue. Code provided: ${code}`,
        expiresInSeconds: 300,
      };
    }
  }

  // If SMTP is not configured in .env yet
  console.log(`[EmailOTP] [DEV MODE] SMTP credentials not set in .env. Generated OTP for ${email}: ${code}`);
  return {
    success: true,
    devMode: true,
    code,
    message:
      lang === 'bn'
        ? 'আপনার ইমেলে কোড পাঠানো হয়েছে (SMTP সেটআপ সম্পন্ন হলে সরাসরি জিমেইলে যাবে)।'
        : 'Verification code generated (Will be delivered to inbox once SMTP is configured in .env).',
    expiresInSeconds: 300,
  };
}

/**
 * Verifies the OTP code submitted by the user
 */
export function verifyOtpCode(
  rawEmail: string,
  rawCode: string,
  lang: 'bn' | 'en' = 'bn'
): { success: boolean; message: string } {
  const email = (rawEmail || '').trim().toLowerCase();
  const code = (rawCode || '').trim();

  if (!email || !code) {
    return {
      success: false,
      message: lang === 'bn' ? 'ইমেইল এবং কোড উভয়ই প্রদান করতে হবে।' : 'Email and code are required.',
    };
  }

  const record = otpStore.get(email);

  if (!record) {
    return {
      success: false,
      message:
        lang === 'bn'
          ? 'কোনো ওটিপি কোড পাওয়া যায়নি। অনুগ্রহ করে নতুন কোড পাঠান।'
          : 'No verification code found. Please request a new code.',
    };
  }

  const now = Date.now();
  if (record.expiresAt < now) {
    otpStore.delete(email);
    return {
      success: false,
      message:
        lang === 'bn'
          ? 'ওটিপি কোডের মেয়াদ শেষ হয়ে গেছে। দয়া করে পুনরায় নতুন কোড পাঠান।'
          : 'Verification code has expired. Please request a new code.',
    };
  }

  // Check attempts (max 5 failed attempts per OTP)
  if (record.attempts >= 5) {
    otpStore.delete(email);
    return {
      success: false,
      message:
        lang === 'bn'
          ? 'অতিরিক্ত ভুল চেষ্টার কারণে কোডটি বাতিল করা হয়েছে। নতুন কোড পাঠান।'
          : 'Too many incorrect attempts. Please request a new code.',
    };
  }

  if (record.code !== code) {
    record.attempts += 1;
    return {
      success: false,
      message: lang === 'bn' ? 'যাচাইকরণ কোডটি সঠিক নয়।' : 'Invalid verification code.',
    };
  }

  // Successfully verified! Delete to prevent reuse
  otpStore.delete(email);
  return {
    success: true,
    message: lang === 'bn' ? 'ইমেইল সফলভাবে যাচাই করা হয়েছে।' : 'Email verified successfully.',
  };
}
