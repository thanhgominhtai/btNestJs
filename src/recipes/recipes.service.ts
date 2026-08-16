import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recipe, RecipeDocument } from './entities/recipe.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

export const STARBUCKS_RECIPES_SEED = [
  {
    name: 'Caramel Macchiato Đặc Biệt',
    description: 'Espresso đậm đà kết hợp sữa tươi đánh nóng mềm mượt và sốt caramel vani béo ngậy.',
    giaCoBan: 65000,
    imgUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=700',
    isPopular: true,
    category: 'Cà phê',
    authorEmail: 'barista@starbucks.vn',
    toppings: [
      { name: 'Sốt Caramel thủ công', quantity: 20, unit: 'ml', price: 10000 },
      { name: 'Shot Espresso bổ sung', quantity: 30, unit: 'ml', price: 15000 },
      { name: 'Foam sữa béo tuyết', quantity: 50, unit: 'ml', price: 8000 },
    ],
  },
  {
    name: 'Trà Sữa Trân Châu Đường Đen Hoàng Gia',
    description: 'Trà sữa đen truyền thống nấu cùng đường nâu tự nhiên, trân châu dẻo bùi chuẩn vị.',
    giaCoBan: 55000,
    imgUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=700',
    isPopular: true,
    category: 'Trà sữa',
    authorEmail: 'barista@starbucks.vn',
    toppings: [
      { name: 'Trân châu đường đen', quantity: 50, unit: 'g', price: 10000 },
      { name: 'Pudding trứng béo', quantity: 40, unit: 'g', price: 10000 },
      { name: 'Thạch dừa giòn', quantity: 30, unit: 'g', price: 8000 },
    ],
  },
  {
    name: 'Matcha Espresso Fusion Thượng Hạng',
    description: 'Sự giao thoa giữa lớp Matcha Nhật Bản thanh mát và tầng Espresso đậm đà nồng nàn.',
    giaCoBan: 68000,
    imgUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=700',
    isPopular: true,
    category: 'Đặc biệt',
    authorEmail: 'barista@starbucks.vn',
    toppings: [
      { name: 'Bột Matcha Uji', quantity: 10, unit: 'g', price: 12000 },
      { name: 'Sữa yến mạch Oatly', quantity: 100, unit: 'ml', price: 15000 },
    ],
  },
  {
    name: 'Cold Brew Kem Béo Hạt Dẻ Cười',
    description: 'Cà phê ủ lạnh 20 tiếng thanh khiết phủ lớp kem mascarpone hạt dẻ bùi thơm ngất ngây.',
    giaCoBan: 62000,
    imgUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=700',
    isPopular: false,
    category: 'Cà phê',
    authorEmail: 'barista@starbucks.vn',
    toppings: [
      { name: 'Kem béo Pistachio', quantity: 40, unit: 'ml', price: 12000 },
      { name: 'Vụn hạt dẻ rang', quantity: 15, unit: 'g', price: 10000 },
    ],
  },
  {
    name: 'Trà Đào Bưởi Hồng Mật Ong Sả',
    description: 'Hương trà lài thanh tao ướp cùng đào mọng nước, bưởi hồng tươi và chút thơm ấm của sả.',
    giaCoBan: 50000,
    imgUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=700',
    isPopular: false,
    category: 'Trà trái cây',
    authorEmail: 'barista@starbucks.vn',
    toppings: [
      { name: 'Đào miếng giòn', quantity: 3, unit: 'miếng', price: 12000 },
      { name: 'Thạch nha đam', quantity: 40, unit: 'g', price: 8000 },
      { name: 'Hạt chia hữu cơ', quantity: 10, unit: 'g', price: 6000 },
    ],
  },
];

@Injectable()
export class RecipesService implements OnModuleInit {
  constructor(
    @InjectModel(Recipe.name) private readonly recipeModel: Model<RecipeDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.recipeModel.countDocuments();
    if (count === 0) {
      await this.recipeModel.insertMany(STARBUCKS_RECIPES_SEED);
      console.log('[RECIPES] Đã seed thành công các món Starbuck menu mẫu!');
    }
  }

  async findAll(keyword?: string, category?: string) {
    const query: any = {};
    if (keyword && keyword.trim()) {
      const key = keyword.trim();
      query.$or = [
        { name: { $regex: key, $options: 'i' } },
        { description: { $regex: key, $options: 'i' } },
      ];
    }
    if (category && category.trim() && category !== 'Tất cả') {
      query.category = category.trim();
    }
    return this.recipeModel.find(query).sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    const recipe = await this.recipeModel.findById(id);
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    return recipe;
  }

  async create(dto: CreateRecipeDto, authorEmail?: string) {
    const newRecipe = new this.recipeModel({
      ...dto,
      authorEmail: authorEmail || dto.authorEmail || 'admin@starbucks.vn',
    });
    return newRecipe.save();
  }

  async update(id: string, dto: UpdateRecipeDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Recipe not found');
    const updated = await this.recipeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Recipe not found');
    return updated;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Recipe not found');
    const deleted = await this.recipeModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Recipe not found');
    return { message: 'Xoá món thành công' };
  }
}
