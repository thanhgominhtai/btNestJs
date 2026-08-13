import { Injectable } from '@nestjs/common';
import { Drink } from './entities/drink.entity';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { DrinkRepository } from './drink.repository.interface';
// Tái sử dụng mảng tĩnh làm database tạm thời
const IN_MEMORY_DB: any[] = [
  {
    id: 'mem1',
    name: 'Trà sữa trân châu đường đen (RAM)',
    description: 'Trà sữa đậm vị, trân châu dai mềm ngâm đường đen.',
    giaCoBan: 45000,
    imgUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600',
    isPopular: true,
    authorEmail: 'quay@trasua.com',
    toppings: [],
  },
];
@Injectable()
export class InMemoryDrinkRepository implements DrinkRepository {
  private drinks = [...IN_MEMORY_DB];
  async create(dto: CreateDrinkDto): Promise<Drink> {
    const newDrink = { ...dto, id: Math.random().toString() } as any;
    this.drinks.push(newDrink);
    return newDrink;
  }
  async findAll(keyword?: string): Promise<Drink[]> {
    if (!keyword) return this.drinks as Drink[];
    const lowerKey = keyword.toLowerCase();
    return this.drinks.filter((d) =>
      d.name.toLowerCase().includes(lowerKey),
    ) as Drink[];
  }
  async findOne(id: string): Promise<Drink | null> {
    return (this.drinks.find((d) => d.id === id) as Drink) || null;
  }
  async update(id: string, dto: UpdateDrinkDto): Promise<Drink | null> {
    const index = this.drinks.findIndex((d) => d.id === id);
    if (index === -1) return null;
    this.drinks[index] = { ...this.drinks[index], ...dto };
    return this.drinks[index] as Drink;
  }
  async remove(id: string): Promise<Drink | null> {
    const index = this.drinks.findIndex((d) => d.id === id);
    if (index === -1) return null;
    const deleted = this.drinks[index];
    this.drinks.splice(index, 1);
    return deleted as Drink;
  }
}
