import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// 1. Schema cho Topping (tắt _id vì nó là mảng con)
@Schema({ _id: false })
export class Topping {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unit: string;
}
export const ToppingSchema = SchemaFactory.createForClass(Topping);

// 2. Schema chính cho Drink
@Schema({
  toJSON: {
    virtuals: true,
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString(); // Biến _id thành id
      delete ret._id; // Xóa _id cũ
      delete ret.__v; // Xóa version
      return ret;
    },
    /* eslint-enable */
  },
})
export class Drink {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  giaCoBan: number;

  @Prop({ required: true })
  imgUrl: string;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ required: true })
  authorEmail: string;

  @Prop({ type: [ToppingSchema], default: [] })
  toppings: Topping[];
}

export type DrinkDocument = Drink & Document;
export const DrinkSchema = SchemaFactory.createForClass(Drink);
