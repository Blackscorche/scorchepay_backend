import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendResetEmail } from "../utils/mailer.js";

// Utility to format errors
const sendValidationErrors = (res, errors) => {
  return res.status(422).json({ errors: errors.array() });
};

// Generate JWT token
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

// Remove sensitive fields before sending response
const sanitizeUser = (user) => {
  const { password, resetPasswordToken, resetPasswordExpiresAt, ...rest } = user.toObject();
  return rest;
};

// SIGNUP
export const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationErrors(res, errors);

  const { username, fullname, phone, email, password } = req.body;

  try {
    const [existingUsername, existingEmail] = await Promise.all([
      User.findOne({ username }),
      User.findOne({ email }),
    ]);

    if (existingUsername)
      return res.status(422).json({ message: "Username already exists" });

    if (existingEmail)
      return res.status(422).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      fullname,
      phone,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// LOGIN
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationErrors(res, errors);

  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${identifier}$`, "i") },
        { username: new RegExp(`^${identifier}$`, "i") },
      ],
    });

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User with this email not found" });

    const token = crypto.randomInt(100000, 999999).toString(); // 6-digit secure token
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = expiry;
    await user.save();

    await sendResetEmail(email, token);

    return res.status(200).json({ message: "Reset token sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Could not send reset token", error });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Could not reset password", error });
  }
};
