import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// ES6 module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    // Don't exit process in serverless environment
  }
};

// Connect to database
connectDB();

// Import routes with error handling
let userRoutes;
try {
  userRoutes = (await import("./routes/users.js")).default;
} catch (error) {
  console.error("❌ Error importing user routes:", error);
  userRoutes = express.Router(); // Fallback empty router
}

app.use("/api/users", userRoutes);

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database:
        mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
      environment: process.env.NODE_ENV || "production",
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "User Management System API",
    version: "1.0.0",
    endpoints: {
      users: {
        "GET /api/users": "Get all users",
        "POST /api/users": "Create new user",
        "GET /api/users/:id": "Get user by ID",
        "PATCH /api/users/:id": "Update user",
        "DELETE /api/users/:id": "Delete user",
        "GET /api/users/analytics/dashboard": "Get analytics dashboard",
      },
      system: {
        "GET /api/health": "Health check",
        "GET /api": "API information",
      },
    },
  });
});

// Serve frontend routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "api-docs.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// 404 handler for frontend routes - serve index.html for SPA
app.use("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Export the app for Vercel serverless
export default app;
