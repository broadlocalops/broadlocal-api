require("dotenv").config();

const express = require("express");
const path = require("path");
const createCheckoutSessionHandler = require("./create-checkout-session");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

app.post("/api/create-checkout-session", createCheckoutSessionHandler);

// Optional static hosting if needed
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`BroadLocal server running on port ${PORT}`);
});
