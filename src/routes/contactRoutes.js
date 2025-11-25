const express = require('express');
const contact = require('../controllers/contactController')

const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();

router.post("/contact",authMiddleware(["admin", "seller","user"]), contact.createContact);
router.get("/contacts", authMiddleware(["admin", "seller"]), contact.getAllContacts);
router.delete("/contact/:id",authMiddleware, contact.deleteContact);

module.exports = router;