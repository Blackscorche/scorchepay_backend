// routes/authRoutes.js
import express from "express";
import { body } from "express-validator";
import {
    signup,
    login,
    forgotPassword,
    resetPassword,
    getAuthenticatedUser,
    logout,
    speedLimiter
} from "../controllers/authControllers.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ SIGNUP ROUTE
router.post(
    "/signup",
    speedLimiter,
    [
        body("username")
            .trim()
            .isLength({ min: 3, max: 20 })
            .withMessage("Username must be 3-20 characters")
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage("Username can only contain letters, numbers, and underscores"),
        body("firstname")
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage("First name must be 2-50 characters"),
        body("lastname")
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage("Last name must be 2-50 characters"),
        body("email")
            .isEmail()
            .normalizeEmail()
            .withMessage("Please provide a valid email"),
        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters")
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
        body("phone")
            .optional()
            .isMobilePhone()
            .withMessage("Please provide a valid phone number")
    ],
    signup
);

// ✅ LOGIN ROUTE
router.post(
    "/signin",
    speedLimiter,
    [
        body("identifier")
            .trim()
            .notEmpty()
            .withMessage("Email or username is required"),
        body("password")
            .notEmpty()
            .withMessage("Password is required")
    ],
    login
);

// ✅ FORGOT PASSWORD ROUTE
router.post(
    "/forgot-password",
    speedLimiter,
    [
        body("email")
            .isEmail()
            .normalizeEmail()
            .withMessage("Please provide a valid email")
    ],
    forgotPassword
);

// ✅ RESET PASSWORD ROUTE
router.post(
    "/reset-password",
    speedLimiter,
    [
        body("token")
            .trim()
            .isLength({ min: 6, max: 6 })
            .withMessage("Token must be 6 digits"),
        body("newPassword")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters")
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
    ],
    resetPassword
);

// ✅ GET AUTHENTICATED USER
router.get("/me", protect, getAuthenticatedUser);

// ✅ LOGOUT ROUTE
router.post("/logout", protect, logout);

export default router;