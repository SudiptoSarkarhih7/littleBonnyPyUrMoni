// app.js — PayPulse entry point
// Configures Express, connects to MongoDB, registers routes

require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const transferRoutes = require("./routes/transferRoutes");
const { errorHandler } = require("./middleware/errorHandler");

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// ── View Engine ───────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form bodies
app.use(cookieParser()); // Parse cookies (for JWT)
app.use(express.static(path.join(__dirname, "public"))); // Serve static assets

// ── Routes ────────────────────────────────────────────────────────────────────

// Root → redirect to dashboard (or login if unauthenticated — handled by protect middleware)
app.get("/", (req, res) => res.redirect("/dashboard"));

// Auth routes: /auth/signup, /auth/login, /auth/logout
app.use("/auth", authRoutes);

// App routes: /dashboard, /send, /transfer, /transactions
app.use("/", transferRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page Not Found",
    message: "The page you're looking for doesn't exist.",
    statusCode: 404,
  });
});

// ── Global Error Handler (must be LAST) ───────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ PayPulse running at http://localhost:${PORT}`);
  console.log(`   Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`   Sign up:    http://localhost:${PORT}/auth/signup`);
  console.log(`   Sign in:    http://localhost:${PORT}/auth/login\n`);
});

module.exports = app;
