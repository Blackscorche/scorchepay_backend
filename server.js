import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Fix CORS here
app.use(cors({
  origin: ['http://localhost:51507', 'https://scorchepay-backend.up.railway.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/auth/wallet", walletRoutes);
app.use("/api/users", userRoutes);

// Error handler (optional, move to bottom)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log("DB_URI:", process.env.DB_URI);
  console.log(`Server running on port ${PORT}`);
});
