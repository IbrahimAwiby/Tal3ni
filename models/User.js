import mongoose from "mongoose";

// Validation functions
const validateEgyptianPhone = (phone) => {
  const phoneRegex = /^(?:\+20|0)?1[0125][0-9]{8}$/;
  return phoneRegex.test(phone);
};

const validateCarNumber = (carNumber) => {
  const carNumberRegex = /^[0-9]{1,8}$/;
  return carNumberRegex.test(carNumber);
};

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [2, "Username must be at least 2 characters long"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      unique: true,
      validate: {
        validator: validateEgyptianPhone,
        message:
          "Please enter a valid Egyptian phone number (e.g., 01012345678 or +201012345678)",
      },
    },
    birthDate: {
      type: Date,
      required: [true, "Birth date is required"],
      validate: {
        validator: function (date) {
          return date < new Date();
        },
        message: "Birth date must be in the past",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female"],
        message: "Gender must be either male or female",
      },
      required: [true, "Gender is required"],
    },
    carNumber: {
      type: String,
      required: [true, "Car number is required"],
      trim: true,
      unique: true,
      validate: {
        validator: validateCarNumber,
        message: "Car number must contain only numbers (1-8 digits)",
      },
    },
    carType: {
      type: String,
      required: [true, "Car type is required"],
      trim: true,
      minlength: [2, "Car type must be at least 2 characters long"],
      maxlength: [50, "Car type cannot exceed 50 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userSchema.index({ phoneNumber: 1 });
userSchema.index({ carNumber: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.model("User", userSchema);
