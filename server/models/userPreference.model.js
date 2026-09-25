import mongoose from 'mongoose';

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    source: {
      type: String,
      enum: ['explicit', 'inferred', 'system'],
      default: 'explicit',
    },
    confidence: { type: Number, default: 1.0, min: 0, max: 1 },
  },
  { timestamps: true }
);

// Compound unique index per user + preference key
userPreferenceSchema.index({ userId: 1, key: 1 }, { unique: true });

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

export default UserPreference;
