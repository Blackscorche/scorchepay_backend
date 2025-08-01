import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protect middleware
// Add this debugging to your authMiddleware.js
// ✅ Fixed Auth Middleware - handles both userId and id in JWT
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔒 Auth Middleware Debug:');
    console.log('- Token present:', !!token);
    console.log('- Authorization header:', req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('- Decoded token:', decoded);

    // ✅ FIX: Handle both userId and id fields from JWT
    const userIdFromToken = decoded.userId || decoded.id;
    console.log('- User ID from token:', userIdFromToken);

    if (!userIdFromToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: no user ID found'
      });
    }

    // Get user from database
    const user = await User.findById(userIdFromToken);
    console.log('- User found:', !!user);

    if (user) {
      console.log('- User ID:', user._id);
      console.log('- User username:', user.username);
      console.log('- User email:', user.email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user not found. Please login again.'
      });
    }

    req.user = user;
    console.log('- req.user set successfully');
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
// restrictTo.js (or inside authMiddleware.js)
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient role" });
    }
    next();
  };
};

// Alias
export const authenticate = protect;

// Authorize middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: You are not authorized" });
    }
    next();
  };
};

export const ensureBVNVerified = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (!user.bvnVerified) {
    return res.status(403).json({ message: 'BVN verification required' });
  }

  next();
};
