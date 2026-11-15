
const express = require("express");
const router = express.Router();

const {
    createCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customerController");

const { authenticateUser } = require("../middleware/authMiddleware");

router.post("/", authenticateUser, createCustomer);
router.get("/", authenticateUser, getCustomers);
router.put("/:id", authenticateUser, updateCustomer);
router.delete("/:id", authenticateUser, deleteCustomer);

module.exports = router;
