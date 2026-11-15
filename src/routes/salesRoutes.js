
const express = require("express");
const router = express.Router();

const {
    createSale,
    getSales
} = require("../controllers/salesController");

const { authenticateUser } = require("../middleware/authMiddleware");

router.post("/", authenticateUser, createSale);
router.get("/", authenticateUser, getSales);

module.exports = router;
