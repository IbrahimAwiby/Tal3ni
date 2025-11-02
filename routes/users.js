import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

const router = express.Router();

// Validation rules
const userValidationRules = [
  body("username")
    .isLength({ min: 2, max: 50 })
    .withMessage("Username must be between 2 and 50 characters")
    .trim()
    .escape(),

  body("phoneNumber")
    .matches(/^(?:\+20|0)?1[0125][0-9]{8}$/)
    .withMessage(
      "Please enter a valid Egyptian phone number (e.g., 01012345678 or +201012345678)"
    ),

  body("birthDate")
    .isISO8601()
    .withMessage("Please enter a valid birth date")
    .custom((value) => {
      if (new Date(value) >= new Date()) {
        throw new Error("Birth date must be in the past");
      }
      return true;
    }),

  body("gender")
    .isIn(["male", "female"])
    .withMessage("Gender must be either male or female"),

  body("carNumber")
    .matches(/^[0-9]{1,8}$/)
    .withMessage("Car number must contain only numbers (1-8 digits)"),

  body("carType")
    .isLength({ min: 2, max: 50 })
    .withMessage("Car type must be between 2 and 50 characters")
    .trim()
    .escape(),
];

// GET all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: err.message,
    });
  }
});

// CREATE new user
router.post("/", userValidationRules, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const user = new User(req.body);
    const newUser = await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (err) {
    console.error("Error creating user:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${
          field === "phoneNumber" ? "Phone number" : "Car number"
        } already exists`,
      });
    }

    res.status(400).json({
      success: false,
      message: "Error creating user",
      error: err.message,
    });
  }
});

// GET single user
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: err.message,
    });
  }
});

// UPDATE user
router.patch("/:id", userValidationRules, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user fields
    const allowedUpdates = [
      "username",
      "phoneNumber",
      "birthDate",
      "gender",
      "carNumber",
      "carType",
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${
          field === "phoneNumber" ? "Phone number" : "Car number"
        } already exists`,
      });
    }

    res.status(400).json({
      success: false,
      message: "Error updating user",
      error: err.message,
    });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: err.message,
    });
  }
});


export default router;
