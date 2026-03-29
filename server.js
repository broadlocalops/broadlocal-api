require("dotenv").config();

const express = require("express");
const path = require("path");
const createCheckoutSessionHandler = require("./create-checkout-session");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------
// Middleware
// -------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve all static files from /public
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// Friendly page routes
// -------------------------
app.get("/", (req, res) => {
  return res.redirect("/employee-notice-documentation");
});

app.get("/employee-notice-documentation", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "employee-notice-documentation.html"));
});

app.get("/termination-documentation-system", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "termination-documentation-system.html"));
});

app.get("/payroll-documentation-readiness", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "payroll-documentation-readiness.html"));
});

app.get("/cart", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "cart.html"));
});

app.get("/checkout", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get("/thank-you", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "thank-you.html"));
});

// -------------------------
// API route
// -------------------------
app.post("/api/create-checkout-session", createCheckoutSessionHandler);

// -------------------------
// Health check
// -------------------------
app.get("/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "broadlocal-api",
    timestamp: new Date().toISOString()
  });
});

// -------------------------
// 404 fallback
// -------------------------
app.use((req, res) => {
  return res.status(404).sendFile(path.join(__dirname, "public", "employee-notice-documentation.html"));
});

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`BroadLocal server running on port ${PORT}`);
});
