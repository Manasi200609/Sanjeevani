import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    patientCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
      min: 0,
      max: 120,
    },

    gender: {
      type: String,
      enum: ["female", "male", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },

    preferredLanguage: {
      type: String,
      required: true,
      default: "English",
    },

    location: {
      village: {
        type: String,
        trim: true,
      },

      district: {
        type: String,
        trim: true,
      },

      state: {
        type: String,
        trim: true,
      },
    },

    baselineState: {
      type: String,
      default: "stable",
      enum: ["stable", "watch", "high_risk"],
    },

    currentState: {
      type: String,
      default: "stable",
      enum: ["stable", "improving", "watch", "urgent", "deteriorating", "high_risk"],
    },

    trajectoryStatus: {
      type: String,
      default: "stable",
      enum: [
        "improving",
        "stable",
        "worsening",
        "unknown",
      ],
    },

    priority: {
  type: String,
  enum: [
    "normal",
    "elevated",
    "high",
    "urgent"
  ],
  default: "normal"
},

    followUp: {
      required: {
        type: Boolean,
        default: false,
      },

      intervalDays: {
        type: Number,
        default: 7,
        min: 1,
      },

      nextFollowUpAt: {
        type: Date,
        default: null,
      },
    },

    lastVisitAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;