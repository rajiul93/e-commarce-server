import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser, UserModel } from './user.interface';

const userSchema = new Schema<IUser, UserModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'MANAGER', 'SELLER'],
      default: 'USER',
    },
    age: {
      type: String,
      trim: true,
    },
    otp: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    profileImage: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
    },
    nid: {
      type: String,
      trim: true,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    monthlySalary: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+password');
};

export const User = model<IUser, UserModel>('User', userSchema);
