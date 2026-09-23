import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true },
    spentUsd: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const AiUsage = mongoose.model('AiUsage', aiUsageSchema);

export default AiUsage;
