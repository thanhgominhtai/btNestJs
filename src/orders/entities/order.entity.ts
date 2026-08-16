import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'Đang làm',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Bị huỷ',
}

@Schema({ _id: false })
export class OrderRecipeSnapshot {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  giaCoBan: number;

  @Prop({ required: true })
  imgUrl: string;

  @Prop({ default: '' })
  category: string;
}
export const OrderRecipeSnapshotSchema = SchemaFactory.createForClass(OrderRecipeSnapshot);

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ type: Types.ObjectId, ref: 'Recipe', required: true })
  recipeId: Types.ObjectId;

  @Prop({ type: OrderRecipeSnapshotSchema, required: true })
  recipeSnapshot: OrderRecipeSnapshot;

  @Prop({ required: true, min: 1, max: 50, default: 1 })
  portions: number; // [US-07] Số lượng khẩu phần

  @Prop({ default: '' })
  note: string; // Ghi chú (ít ngọt, không đá...)

  @Prop({ default: 'Nhận ngay' })
  desiredTime: string; // Thời gian mong muốn nhận

  @Prop({ required: true })
  totalPrice: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus; // [US-11, AD-02]

  @Prop({ default: '' })
  cancelReason: string; // [US-11, AD-03] Lý do huỷ do Admin nhập
}

export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order);
