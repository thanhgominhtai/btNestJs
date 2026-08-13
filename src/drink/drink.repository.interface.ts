import { Drink } from './entities/drink.entity';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';

export interface DrinkRepository {
  create(dto: CreateDrinkDto): Promise<Drink>;
  findAll(keyword?: string): Promise<Drink[]>;
  findOne(id: string): Promise<Drink | null>;
  update(id: string, dto: UpdateDrinkDto): Promise<Drink | null>;
  remove(id: string): Promise<Drink | null>;
}

// Token này dùng để "đánh dấu" khi tiêm (Inject)
export const DRINK_REPOSITORY = Symbol('DRINK_REPOSITORY');
