import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import walletRoutes from "./routes/WalletRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});



connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/auth/wallet", walletRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log("DB_URI:", process.env.DB_URI);
  console.log(`Server running on port ${PORT}`);
});
