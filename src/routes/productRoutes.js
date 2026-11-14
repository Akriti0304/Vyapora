
const express = require("express");
const router = express.Router();

const {
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const { authenticateUser } = require("../middleware/authMiddleware");

router.post("/", authenticateUser, addProduct);
router.get("/", authenticateUser, getProducts);
router.put("/:id", authenticateUser, updateProduct);
router.delete("/:id", authenticateUser, deleteProduct);

module.exports = router;
