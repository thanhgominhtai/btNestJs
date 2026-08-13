import { Topping } from '../entities/drink.entity';

export class CreateDrinkDto {
  name: string;
  description: string;
  giaCoBan: number;
  imgUrl: string;
  isPopular?: boolean;
  toppings: Topping[];
  authorEmail: string;
}
