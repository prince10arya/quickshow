import mongoose from 'mongoose';

const showSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true, ref: 'Movie' },
    showDateTime: { type: String, required: true },
    showPrice: { type: Number, required: true },
    occupiedSeates: { type: Object, default: {} },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export const Show = mongoose.models.Show || mongoose.model('Show', showSchema);
export default Show;
