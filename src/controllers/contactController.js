
const Contact = require('../models/contact')
const response = require('../responses')

exports.createContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    const newContact = new Contact({
      name,
      email,
      phone,
      message,
    });

    await newContact.save();

    res.status(201).json({
      message: "Contact form submitted successfully",
      data: newContact,
    });
  } catch (error) {
    console.error("Error in createContact:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    return response.success(res, contacts);
  } catch (error) {
    console.error("Error getting contacts:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Contact.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};