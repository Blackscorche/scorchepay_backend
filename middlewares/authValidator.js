import { body } from 'express-validator';

export const signupValidator = [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstname').notEmpty().withMessage('First name is required'),
    body('lastname').notEmpty().withMessage('Last name is required'),
    body('phone').notEmpty().withMessage('Phone number is required')
        .isMobilePhone().withMessage('Invalid phone number format'),
];

export const loginValidator = [
    body("identifier").notEmpty().withMessage("Identifier is required"),
    body("password").notEmpty().withMessage("Password is required")
];