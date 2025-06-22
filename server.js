import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Apply CORS before anything else
app.use(cors({
  origin: ['http://localhost:51507', 'https://scorchepay-backend.up.railway.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ✅ Handle preflight manually just in case
app.options('*', cors());

// ✅ Parse body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MongoDB
connectDB();

// ✅ Define your routes
app.use("/api/auth", authRoutes);

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log("DB_URI:", process.env.DB_URI);
  console.log(`Server running on port ${PORT}`);
});
