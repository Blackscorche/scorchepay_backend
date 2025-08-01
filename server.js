import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import VtuRoutes from "./routes/VtuRoutes.js";
import giftcardRoutes from "./routes/giftcardRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import bankTransferRoutes from "./routes/bankTransferRoutes.js";
import transactionRoutes from './routes/transactionsRoute.js';
import plansRoutes from "./routes/plansRoutes.js";




dotenv.config();

const app = express();
// CORS configuration - FIXED VERSION
const corsOptions = {
    origin: ['http://localhost:5173'],
    credentials: true, // Allow cookies/credentials
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
// Custom sanitize middleware for Express v5 compatibility
app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.params) mongoSanitize.sanitize(req.params);
    // Do NOT sanitize req.query to avoid Express v5 error
    next();
});
app.use(morgan("dev"));
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: "Too many requests, please try again later.",
    })
);

// ─── Connect to MongoDB ──────────────────────────────────────
connectDB();

// ─── Routes ───────────────────────────────────────────────────
// server.js or app.js

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vtu", VtuRoutes);
app.use("/api/giftcard", giftcardRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/bank", bankTransferRoutes);
app.use("/api/webhook", webhookRoutes); // Should not be protected
app.use('/api/transactions', transactionRoutes);
app.use("/api/vtu", plansRoutes);




// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));