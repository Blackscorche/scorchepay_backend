import express from "express";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { getAllUsers, updateUserStatus, deleteUser } from "../controllers/adminController.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", getAllUsers);
router.patch("/users/:userId/verify", updateUserStatus);
router.delete("/users/:userId", deleteUser);

export default router;
