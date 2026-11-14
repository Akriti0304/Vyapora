
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const shopRoutes = require("./routes/shopRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "VYAPORA backend is running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);

module.exports = app;
