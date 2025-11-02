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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API Routes
import userRoutes from "./routes/users.js";
app.use("/api/users", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    environment: process.env.NODE_ENV || "development",
  });
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

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/user_management";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  if (req.originalUrl.startsWith("/api/")) {
    res.status(404).json({
      success: false,
      message: "API endpoint not found",
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
  }
});

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`
🚀 ${"=".repeat(60)}
🎯 USER MANAGEMENT SYSTEM - ${process.env.NODE_ENV || "development"}
${"=".repeat(60)}

📊 SERVER INFORMATION:
   🔹 Port: ${PORT}
   🔹 Environment: ${process.env.NODE_ENV || "development"}
   🔹 Database: ${
     mongoose.connection.readyState === 1 ? "✅ Connected" : "🔄 Connecting..."
   }
   🔹 MongoDB: ${MONGODB_URI.includes("mongodb.net") ? "✅ Atlas" : "❌ Local"}

🌐 APPLICATION URLS:
   🔹 Main App: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}
   🔹 Dashboard: ${
     process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
   }/dashboard
   🔹 API Docs: ${
     process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
   }/api-docs
   🔹 Health Check: ${
     process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
   }/api/health

📡 API ENDPOINTS:
   🔹 GET    /api/users     - Get all users
   🔹 POST   /api/users     - Create user
   🔹 GET    /api/users/:id - Get user by ID
   🔹 PATCH  /api/users/:id - Update user
   🔹 DELETE /api/users/:id - Delete user

🛠️ FEATURES:
   🔹 Egyptian Phone Validation
   🔹 Car Number Validation
   🔹 Real-time Analytics
   🔹 Responsive Design
   🔹 Production Ready

${"=".repeat(60)}
✨ Server is running and ready for production!
⏰ Started at: ${new Date().toLocaleString()}
${"=".repeat(60)}
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔻 Shutting down server gracefully...");
  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🔻 Server terminated gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
