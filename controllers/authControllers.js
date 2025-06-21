import { validationResult } from "express-validator";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendResetEmail } from "../utils/mailer.js";

export const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { username, firstname, lastname, phone, email, password } = req.body;

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(422).json({ message: "Username already exists" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(422).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      firstname,
      lastname,
      phone,
      email,
      password: hashedPassword,
    });

    const { password: pwd, ...userWithoutPassword } = user.toObject();

    return res.status(201).json({ message: "User created successfully", user: userWithoutPassword });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// LOGIN
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${identifier}$`, "i") },
        { username: new RegExp(`^${identifier}$`, "i") },
      ],
    });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    user.lastLogin = new Date();
    await user.save();

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
    return res.status(500).json({ message: "Internal server error", error });
  }
};

// FORGOT PASSWORD (sends a reset token)
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Use a secure random token
    const token= Math.floor(100000+ Math.random() * 900000).toString(); // 6-digit token
    const expiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = expiry;
    await user.save();

    // Send token via email
    await sendResetEmail(email, token);

    res.status(200).json({ message: "Reset token sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Error generating token", error });
  }
};

// RESET PASSWORD (uses token)
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error });
  }
};

