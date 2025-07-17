
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import n3dataRoutes from "./routes/n3dataRoutes.js";
import giftcardRoutes from "./routes/giftcardRoutes.js";
import connectDB from "./config/db.js";



const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(mongoSanitize());
app.use(morgan("dev"));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later."
}));


// Connect DB
connectDB();


// Routes

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/n3data", n3dataRoutes);
app.use("/api/giftcard", giftcardRoutes);


const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
