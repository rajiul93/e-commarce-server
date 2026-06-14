import { Schema, model, Model } from 'mongoose';
import type { AttributeCreateInput } from './attribute.interface';

export type AttributeModelType = Model<AttributeCreateInput>;

const attributeSchema = new Schema<AttributeCreateInput, AttributeModelType>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    values: [{ type: String, required: true, trim: true }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      required: true,
      default: 'active',
    },
  },
  { timestamps: true },
);

export const Attribute = model<AttributeCreateInput, AttributeModelType>('Attribute', attributeSchema);
