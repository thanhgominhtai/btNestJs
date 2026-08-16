import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PasswordReset {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  otp: string; // 6-digit OTP

  @Prop({ default: null })
  resetToken: string; // temporary token for step 3

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}

export type PasswordResetDocument = PasswordReset & Document;
export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
