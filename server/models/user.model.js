import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  image:    { type: String, default: '' },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  favorites:{ type: [String], default: [] },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
