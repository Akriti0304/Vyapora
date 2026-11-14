
const express = require("express");
const router = express.Router();

const {
    createShop,
    getShops,
    updateShop,
    deleteShop
} = require("../controllers/shopController");

const { authenticateUser } = require("../middleware/authMiddleware");

router.post("/", authenticateUser, createShop);
router.get("/", authenticateUser, getShops);
router.put("/:id", authenticateUser, updateShop);
router.delete("/:id", authenticateUser, deleteShop);

module.exports = router;
