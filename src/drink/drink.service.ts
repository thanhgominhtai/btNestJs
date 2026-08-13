import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { Drink } from './entities/drink.entity';
import { DRINK_REPOSITORY } from './drink.repository.interface';
import type { DrinkRepository } from './drink.repository.interface';

@Injectable()
export class DrinkService {
  constructor(
    // Thay vì InjectModel, bây giờ ta Inject cái Interface
    @Inject(DRINK_REPOSITORY) private readonly repo: DrinkRepository,
  ) {}
  // *Chú ý: Chức năng seed data (onModuleInit) bạn có thể chuyển tạm sang main.ts hoặc tự chèn thủ công trên Mongo Atlas vì Repository Interface không chứa logic countDocuments.*
  async create(createDrinkDto: CreateDrinkDto) {
    return this.repo.create(createDrinkDto);
  }
  async findAll(keyword?: string): Promise<Drink[]> {
    return this.repo.findAll(keyword);
  }
  async findOne(id: string): Promise<Drink> {
    const drink = await this.repo.findOne(id);
    // Service mới là nơi văng lỗi HTTP 404
    if (!drink) throw new NotFoundException(`Drink with id ${id} not found`);
    return drink;
  }
  async update(id: string, updateDrinkDto: UpdateDrinkDto) {
    const updatedDrink = await this.repo.update(id, updateDrinkDto);
    if (!updatedDrink)
      throw new NotFoundException(`Drink with id ${id} not found`);
    return updatedDrink;
  }
  async remove(id: string) {
    const deleted = await this.repo.remove(id);
    if (!deleted) throw new NotFoundException(`Drink with id ${id} not found`);
  }
}
