import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class RecipeTopping {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unit: string;

  @Prop({ default: 0 })
  price: number;
}
export const RecipeToppingSchema = SchemaFactory.createForClass(RecipeTopping);

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
export class Recipe {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  giaCoBan: number;

  @Prop({ required: true })
  imgUrl: string;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: 'Đặc biệt' })
  category: string;

  @Prop({ default: 'admin@starbucks.vn' })
  authorEmail: string;

  @Prop({ type: [RecipeToppingSchema], default: [] })
  toppings: RecipeTopping[];
}

export type RecipeDocument = Recipe & Document;
export const RecipeSchema = SchemaFactory.createForClass(Recipe);
