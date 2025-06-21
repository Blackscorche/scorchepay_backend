import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, "../assets/ScorcheLogo.png");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetEmail = async (to, token) => {
  const mailOptions = {
    from: `"ScorchePay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    text: `Your password reset code is: ${token}`,
    html: `
      <div style="background:#f7f8fa; color:#23272f; max-width:420px; margin:40px auto; border-radius:20px; box-shadow:0 4px 24px #0001; padding:36px 28px; font-family:'Segoe UI', Arial, sans-serif;">

        <h3 style="text-align:center; color:#23272f; font-size:1.3rem; margin-bottom:10px; letter-spacing:1px;">Password Reset Code</h3>
        <div style="text-align:center; margin:28px 0;">
          <span style="display:inline-block; font-size:2.2rem; letter-spacing:10px; font-weight:700; color:#ff3c3c; background:#fff; border-radius:12px; padding:18px 0; width:220px; box-shadow:0 2px 8px #ff3c3c22;">
            ${token}
          </span>
        </div>
        <p style="text-align:center; color:#23272f; font-size:1.1rem; margin-bottom:18px;">
          Enter this <span style="color:#ff3c3c; font-weight:600;">6-digit code</span> in the app to reset your password.<br>
          <span style="color:#888; font-size:0.98em;">This code is valid for 15 minutes.</span>
        </p>
        <div style="border-top:1px solid #eee; margin-top:32px; padding-top:16px; text-align:center;">
          <span style="color:#888; font-size:0.95em;">If you did not request this, you can safely ignore this email.</span>
          <br>
          <span style="color:#ff3c3c; font-size:1em; font-weight:bold; letter-spacing:1px;">ScorchePay</span>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};