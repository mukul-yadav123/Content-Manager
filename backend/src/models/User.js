import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    settings: {
      defaultLanguage: { type: String, default: 'en' },
      notificationsEnabled: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
export default User;

