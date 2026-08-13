import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Drink, DrinkDocument } from './entities/drink.entity';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { DrinkRepository } from './drink.repository.interface';
@Injectable()
// Khai báo class này tuân thủ theo DrinkRepository interface
export class MongooseDrinkRepository implements DrinkRepository {
  constructor(
    @InjectModel(Drink.name) private readonly drinkModel: Model<DrinkDocument>,
  ) {}
  async create(dto: CreateDrinkDto): Promise<Drink> {
    const newDrink = new this.drinkModel(dto);
    return await newDrink.save();
  }
  async findAll(keyword?: string): Promise<Drink[]> {
    const key = keyword?.trim();
    if (!key) return this.drinkModel.find().exec();
    return this.drinkModel
      .find({ name: { $regex: key, $options: 'i' } })
      .exec();
  }
  async findOne(id: string): Promise<Drink | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.drinkModel.findById(id).exec();
  }
  async update(id: string, dto: UpdateDrinkDto): Promise<Drink | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.drinkModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }
  async remove(id: string): Promise<Drink | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.drinkModel.findByIdAndDelete(id).exec();
  }
}
