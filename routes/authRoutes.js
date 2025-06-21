import express from "express";
import { signup, login, forgotPassword, resetPassword } from "../controllers/authControllers.js";
import { signupValidator, loginValidator } from "../middlewares/authValidator.js";

const router = express.Router();

router.post("/signup", signupValidator, signup);
router.post("/signin", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;