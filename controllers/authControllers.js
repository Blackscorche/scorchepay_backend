import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js"; // ✅ ADD THIS IMPORT - IT'S MISSING!
import { sendResetEmail } from "../utils/mailer.js";

dotenv.config();

// Rate limiting for login attempts
const limiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 5,
  delayMs: () => 500,
});

// Slow down repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 3,
  delayMs: () => 500,
});

// Create default admin and merchant if not exist
export const ensureDefaultUsers = async () => {
  const defaultUsers = [
    {
      username: process.env.DEFAULT_ADMIN_USERNAME,
      email: process.env.DEFAULT_ADMIN_EMAIL,
      password: process.env.DEFAULT_ADMIN_PASSWORD,
      role: "admin",
    },
    {
      username: process.env.DEFAULT_MERCHANT_USERNAME,
      email: process.env.DEFAULT_MERCHANT_EMAIL,
      password: process.env.DEFAULT_MERCHANT_PASSWORD,
      role: "giftcardVerifier",
    },
  ];

  for (const u of defaultUsers) {
    if (!u.username || !u.email || !u.password) continue;

    try {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        const hash = await bcrypt.hash(u.password, 12);
        await User.create({
          username: u.username,
          email: u.email,
          password: hash,
          role: u.role,
          isVerified: true,
          loginAttempts: 0,
          accountLocked: false,
        });
        console.log(`✅ Created default user: ${u.username}`);
      }
    } catch (error) {
      console.error(`❌ Error creating default user ${u.username}:`, error);
    }
  }
};

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

// Utility to format errors
const sendValidationErrors = (res, errors) => {
  return res.status(422).json({ errors: errors.array() });
};

// Generate JWT token with additional security
const generateToken = (userId) => {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    algorithm: 'HS256',
  });
};

// Remove sensitive fields before sending response
const sanitizeUser = (user) => {
  const {
    password,
    resetPasswordToken,
    resetPasswordExpiresAt,
    loginAttempts,
    accountLocked,
    lockUntil,
    ...rest
  } = user.toObject();
  return rest;
};

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().toLowerCase();
};

// SIGNUP
export const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationErrors(res, errors);

  const { username, firstname, lastname, phone, email, password } = req.body;

  // Sanitize inputs
  const sanitizedUsername = sanitizeInput(username);
  const sanitizedEmail = sanitizeInput(email);

  try {
    // Check for existing users with proper case-insensitive search
    const [existingUsername, existingEmail] = await Promise.all([
      User.findOne({ username: new RegExp(`^${sanitizedUsername}$`, "i") }),
      User.findOne({ email: new RegExp(`^${sanitizedEmail}$`, "i") }),
    ]);

    if (existingUsername) {
      return res.status(422).json({ message: "Username already exists" });
    }

    if (existingEmail) {
      return res.status(422).json({ message: "Email already exists" });
    }

    // Enhanced password hashing
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: sanitizedUsername,
      firstname: firstname?.trim(),
      lastname: lastname?.trim(),
      phone: phone?.trim(),
      email: sanitizedEmail,
      password: hashedPassword,
      loginAttempts: 0,
      accountLocked: false,
      createdAt: new Date(),
    });

    console.log(`✅ User created successfully: ${user.username}`);

    return res.status(201).json({
      message: "User created successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    console.log('🔐 Login attempt:', {
      identifier: identifier ? '[PRESENT]' : '[MISSING]',
      password: password ? '[PRESENT]' : '[MISSING]',
      bodyKeys: Object.keys(req.body)
    });

    // Validation
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Email or username is required"
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() }
      ]
    });

    console.log('👤 User lookup:', {
      identifier,
      userFound: !!user,
      userId: user?._id,
      username: user?.username
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.password) {
      console.error('❌ User has no password hash:', user._id);
      return res.status(500).json({
        success: false,
        message: "Account error. Please contact support."
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ FIXED: Access nested virtualAccountDetails correctly
    const virtualAccount = user.virtualAccountDetails || {};

    const userResponse = {
      id: user._id,
      username: user.username,
      firstname: user.firstname || null,
      lastname: user.lastname || null,
      email: user.email,
      phone: user.phone || null,
      wallets: user.wallets || { ngn: 0, usdt: 0 },
      hasVirtualAccount: user.hasVirtualAccount || false,
      flutterwaveAccountId: user.flutterwaveAccountId || null,
      // ✅ CORRECT: Access nested account details
      account_number: virtualAccount.account_number || null,
      account_bank: virtualAccount.bank_name || null,
      account_name: virtualAccount.account_name || null,
      order_ref: virtualAccount.order_ref || null,
      // Additional user info
      role: user.role || 'user',
      isVerified: user.isVerified || false,
      bvnSubmitted: user.bvnSubmitted || false,
      createdAt: user.createdAt
    };

    // ✅ Debug log to see actual virtual account details
    console.log('🏦 Virtual account details:', {
      userId: user._id,
      hasVirtualAccount: user.hasVirtualAccount,
      virtualAccountDetails: user.virtualAccountDetails,
      flutterwaveAccountId: user.flutterwaveAccountId
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: userResponse
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Rest of your code remains the same...
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const sanitizedEmail = sanitizeInput(email);

  try {
    const user = await User.findOne({
      email: new RegExp(`^${sanitizedEmail}$`, "i")
    });

    const successMessage = "If an account with this email exists, a reset token has been sent";

    if (!user) {
      return res.status(200).json({ message: successMessage });
    }

    if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt > new Date()) {
      return res.status(200).json({ message: successMessage });
    }

    const token = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = await bcrypt.hash(token, 10);
    user.resetPasswordExpiresAt = expiry;
    user.resetPasswordAttempts = 0;
    await user.save();

    await sendResetEmail(user.email, token);

    return res.status(200).json({ message: successMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const users = await User.find({
      resetPasswordToken: { $exists: true },
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    let validUser = null;

    for (const user of users) {
      const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);
      if (isValidToken) {
        validUser = user;
        break;
      }
    }

    if (!validUser) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if ((validUser.resetPasswordAttempts || 0) >= 3) {
      return res.status(429).json({ message: "Too many reset attempts. Please request a new token." });
    }

    validUser.password = await bcrypt.hash(newPassword, 12);
    validUser.resetPasswordToken = undefined;
    validUser.resetPasswordExpiresAt = undefined;
    validUser.resetPasswordAttempts = undefined;
    validUser.passwordChangedAt = new Date();

    await validUser.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAuthenticatedUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (currentUser.accountLocked) {
      return res.status(423).json({ message: "Account is locked" });
    }

    res.status(200).json({
      user: {
        _id: currentUser._id,
        username: currentUser.username,
        firstname: currentUser.firstname,
        lastname: currentUser.lastname,
        email: currentUser.email,
        phone: currentUser.phone,
        role: currentUser.role,
        wallets: currentUser.wallets,
        isVerified: currentUser.isVerified,
        lastLogin: currentUser.lastLogin,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('authToken');
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ GET USER PROFILE - This was missing!
export const getUserProfile = async (req, res) => {
  try {
    console.log('🔍 Getting profile for user ID:', req.user.id);

    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpiresAt');

    if (!user) {
      console.log('❌ User not found for ID:', req.user.id);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log('✅ Profile retrieved for user:', user.username);

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      user: {
        _id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        bvnVerified: user.bvnVerified,
        wallets: user.wallets,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving profile"
    });
  }
};

// ✅ UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const { firstname, lastname, phone } = req.body;

    console.log('🔄 Updating profile for user:', req.user.id);

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update only provided fields
    if (firstname !== undefined) user.firstname = firstname.trim();
    if (lastname !== undefined) user.lastname = lastname.trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();

    console.log('✅ Profile updated for user:', user.username);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        bvnVerified: user.bvnVerified
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile"
    });
  }
};