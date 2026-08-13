# 📘 Lộ Trình Thực Hành NestJS & Tích Hợp Angular

Chào bạn, dựa trên đề bài cực kỳ chi tiết của bạn, mục tiêu tối thượng của chúng ta là **xây dựng một API Backend bằng NestJS thật vững chắc**, sau đó **nối nó vào project Angular (`btvnAngu`)**.

Học theo cách này rất thực tế vì ở các dự án thật, Frontend và Backend luôn tách biệt và giao tiếp với nhau qua API. Dưới đây là lộ trình từng bước, **kèm theo các trạm kiểm tra (Checkpoints)** để bạn tự test xem mình làm đúng hay sai nhé!

---

## 🎯 Phần C: Hoàn thiện Quầy Trà Sữa API

### 📍 C-N4: Hoàn thiện `DrinkService`
File: `src/drink/drink.service.ts`

Bạn hãy copy toàn bộ đoạn code này đè vào file `drink.service.ts`:

<details>
<summary>Nhấn vào đây để xem toàn bộ code DrinkService</summary>

```typescript
import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Drink, DrinkDocument } from './entities/drink.entity';
import { Model, Types } from 'mongoose';

// Dữ liệu chuẩn từ đề bài để khớp với Angular
export const SEED_DRINKS = [
  {
    name: 'Trà sữa trân châu đường đen',
    description: 'Trà sữa đậm vị, trân châu dai mềm ngâm đường đen.',
    giaCoBan: 45000,
    imgUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600',
    isPopular: true,
    authorEmail: 'quay@trasua.com',
    toppings: [
      { name: 'Trân châu đường đen', quantity: 50, unit: 'g' },
      { name: 'Sữa tươi', quantity: 100, unit: 'ml' },
    ],
  },
  {
    name: 'Trà sữa Matcha',
    description: 'Matcha Nhật nguyên chất, hơi đắng nhẹ, thơm dịu.',
    giaCoBan: 52000,
    imgUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600',
    isPopular: true,
    authorEmail: 'quay@trasua.com',
    toppings: [
      { name: 'Bột matcha', quantity: 8, unit: 'g' },
      { name: 'Sữa tươi', quantity: 120, unit: 'ml' },
    ],
  },
  {
    name: 'Hồng trà sữa',
    description: 'Hồng trà truyền thống pha sữa, vị cân bằng dễ uống.',
    giaCoBan: 35000,
    imgUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600',
    isPopular: false,
    authorEmail: 'quay@trasua.com',
    toppings: [
      { name: 'Hồng trà', quantity: 10, unit: 'g' },
      { name: 'Thạch dừa', quantity: 40, unit: 'g' },
    ],
  },
];

@Injectable()
export class DrinkService implements OnModuleInit {
  constructor(
    @InjectModel(Drink.name) private readonly drinkModel: Model<DrinkDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.drinkModel.countDocuments();
    if (count === 0) {
      await this.drinkModel.insertMany(SEED_DRINKS);
      console.log('Seed dữ liệu thành công!');
    }
  }

  async create(createDrinkDto: CreateDrinkDto) {
    const newDrink = new this.drinkModel(createDrinkDto);
    return await newDrink.save();
  }

  async findAll(keyword?: string): Promise<Drink[]> {
    const key = keyword?.trim();
    if (!key) return this.drinkModel.find().exec();
    
    return this.drinkModel
      .find({ name: { $regex: key, $options: 'i' } })
      .exec();
  }

  async findOne(id: string): Promise<Drink> {
    const drink = Types.ObjectId.isValid(id)
      ? await this.drinkModel.findById(id).exec()
      : null;

    if (!drink) throw new NotFoundException(`Drink with id ${id} not found`);
    return drink;
  }

  async update(id: string, updateDrinkDto: UpdateDrinkDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();

    const updatedDrink = await this.drinkModel
      .findByIdAndUpdate(id, updateDrinkDto, { new: true })
      .exec();

    if (!updatedDrink) throw new NotFoundException();
    return updatedDrink;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const deleted = await this.drinkModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException();
  }
}
```
</details>

### 📍 C-N5: Hoàn thiện `DrinkController`
File: `src/drink/drink.controller.ts`

<details>
<summary>Nhấn vào đây để xem toàn bộ code DrinkController</summary>

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode } from '@nestjs/common';
import { DrinkService } from './drink.service';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';

@Controller('drinks')
export class DrinkController {
  constructor(private readonly drinkService: DrinkService) {}

  @Post()
  create(@Body() createDrinkDto: CreateDrinkDto) {
    return this.drinkService.create(createDrinkDto);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string) {
    return this.drinkService.findAll(keyword);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drinkService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDrinkDto: UpdateDrinkDto) {
    return this.drinkService.update(id, updateDrinkDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.drinkService.remove(id);
  }
}
```
</details>

> [!TIP]
> 🛑 **Checkpoint số 1 (Kiểm tra lỗi cú pháp)**: Sau khi copy xong Service và Controller, bạn mở Terminal lên và chạy lệnh `npm run build`. Nếu terminal báo `Found 0 errors. Watching for file changes.` hoặc không báo lỗi văng chữ đỏ nào thì chúc mừng, code của bạn không có lỗi cú pháp!

### 📍 C-N6: Kết nối MongoDB Atlas
File: `src/app.module.ts`

1. Tạo file `.env` ở thư mục gốc của backend:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/bai-tap-tra-sua?retryWrites=true&w=majority
   ```
2. Sửa file `src/app.module.ts`:
   <details>
   <summary>Code AppModule</summary>

   ```typescript
   import { Module } from '@nestjs/common';
   import { AppController } from './app.controller';
   import { AppService } from './app.service';
   import { DrinkModule } from './drink/drink.module';
   import { MongooseModule } from '@nestjs/mongoose';
   import { ConfigModule, ConfigService } from '@nestjs/config';

   @Module({
     imports: [
       ConfigModule.forRoot({ isGlobal: true }),
       MongooseModule.forRootAsync({
         inject: [ConfigService],
         useFactory: (config: ConfigService) => ({
           uri: config.get<string>('MONGODB_URI'),
         }),
       }),
       DrinkModule,
     ],
     controllers: [AppController],
     providers: [AppService],
   })
   export class AppModule {}
   ```
   </details>

> [!WARNING]
> Lỗi kết nối thường gặp: Nếu bạn thấy lỗi liên quan đến `Observable._subscribe` hoặc `IP Address`, hãy lên lại trang MongoDB Atlas -> **Network Access** -> Thêm IP `0.0.0.0/0` (Allow Access from Anywhere) để máy tính của bạn truy cập được vào DB nhé!

### 📍 C-N7: Test API & Kiểm tra dữ liệu thật

Đây là bước quan trọng nhất để chứng minh mọi thứ hoạt động. Khi làm thực tế, Dev luôn phải test kĩ bước này!

#### 1. Kiểm tra bằng trình duyệt (hoặc Postman / Thunder Client)
1. Đảm bảo app đang chạy (`npm run start:dev`).
2. Mở trình duyệt, gõ đường dẫn: `http://localhost:3000/drinks`
3. **Kỳ vọng:** Bạn phải thấy một mảng (JSON) chứa 3 món trà sữa hiển thị trên màn hình.

#### 2. Kiểm tra trên Database thật (MongoDB Atlas)
1. Đăng nhập vào trang web MongoDB Atlas -> **Browse Collections**.
2. Chọn database `bai-tap-tra-sua`, chọn collection `drinks`.
3. **Kỳ vọng:** Bạn sẽ nhìn thấy 3 documents (3 món trà sữa) nằm chễm chệ trong đó.

---
---

## 🚀 Phần D: Repository Pattern (Level up Kiến Trúc - BẮT BUỘC)

Phần này sẽ giúp code bạn tách biệt hoàn toàn việc "xử lý dữ liệu MongoDB" ra khỏi "Logic nghiệp vụ". Đây là chuẩn mà các dự án lớn hay xài (để dễ test, dễ đổi database).

### D1 - Định nghĩa Interface
Tạo file mới: `src/drink/drink.repository.interface.ts`
*(Lưu ý: Bạn tự tạo file này trong thư mục `src/drink` nhé)*

```typescript
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
```

### D2 - Code Mongoose Repository thực tế
Tạo file mới: `src/drink/mongoose-drink.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Drink, DrinkDocument } from './entities/drink.entity';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { DrinkRepository } from './drink.repository.interface';

@Injectable()
export class MongooseDrinkRepository implements DrinkRepository {
  constructor(@InjectModel(Drink.name) private readonly drinkModel: Model<DrinkDocument>) {}

  async create(dto: CreateDrinkDto): Promise<Drink> {
    const newDrink = new this.drinkModel(dto);
    return await newDrink.save();
  }

  async findAll(keyword?: string): Promise<Drink[]> {
    const key = keyword?.trim();
    if (!key) return this.drinkModel.find().exec();
    return this.drinkModel.find({ name: { $regex: key, $options: 'i' } }).exec();
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
```

### D3 - Bind (Gắn) token trong Module
Mở file `src/drink/drink.module.ts`, ta sẽ nói cho NestJS biết: *"Mỗi khi ai đó gọi token `DRINK_REPOSITORY`, hãy cung cấp cho họ class `MongooseDrinkRepository`"*.

```typescript
import { Module } from '@nestjs/common';
import { DrinkService } from './drink.service';
import { DrinkController } from './drink.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Drink, DrinkSchema } from './entities/drink.entity';
import { DRINK_REPOSITORY } from './drink.repository.interface';
import { MongooseDrinkRepository } from './mongoose-drink.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Drink.name, schema: DrinkSchema }]),
  ],
  controllers: [DrinkController],
  providers: [
    DrinkService,
    // Đăng ký Repository
    { provide: DRINK_REPOSITORY, useClass: MongooseDrinkRepository },
  ],
})
export class DrinkModule {}
```

### D4 - Cập nhật Service: Vứt bỏ Mongoose!
Lúc này Service không cần biết Mongoose hay MongoDB là gì nữa, nó chỉ biết gọi hàm của Repository.
Mở file `src/drink/drink.service.ts` và sửa lại:

<details>
<summary>Nhấn vào đây để xem toàn bộ code DrinkService (MỚI)</summary>

```typescript
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

  async create(createDrinkDto: CreateDrinkDto) {
    return this.repo.create(createDrinkDto);
  }

  async findAll(keyword?: string): Promise<Drink[]> {
    return this.repo.findAll(keyword);
  }

  async findOne(id: string): Promise<Drink> {
    const drink = await this.repo.findOne(id);
    if (!drink) throw new NotFoundException(`Drink with id ${id} not found`);
    return drink;
  }

  async update(id: string, updateDrinkDto: UpdateDrinkDto) {
    const updatedDrink = await this.repo.update(id, updateDrinkDto);
    if (!updatedDrink) throw new NotFoundException(`Drink with id ${id} not found`);
    return updatedDrink;
  }

  async remove(id: string) {
    const deleted = await this.repo.remove(id);
    if (!deleted) throw new NotFoundException(`Drink with id ${id} not found`);
  }
}
```
</details>

> [!TIP]
> 🛑 **Checkpoint D**: Hãy test lại lệnh GET list đồ uống. Nếu kết quả trả về y hệt như cũ, thì chúc mừng bạn! Hành vi bên ngoài vẫn giữ nguyên nhưng ruột bên trong đã đổi 100% (Đây chính là triết lý `Seam`).

---

### D5 - Chứng minh Seam là thật (InMemoryDrinkRepository)

Ở bước này, chúng ta tạo một class lưu dữ liệu trên RAM (giống hệt bài Angular trước đây).
Tạo file: `src/drink/in-memory-drink.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Drink } from './entities/drink.entity';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { DrinkRepository } from './drink.repository.interface';

// Tái sử dụng mảng tĩnh làm database tạm thời
const IN_MEMORY_DB: any[] = [
  {
    id: "mem1",
    name: 'Trà sữa trân châu đường đen (RAM)',
    description: 'Trà sữa đậm vị, trân châu dai mềm ngâm đường đen.',
    giaCoBan: 45000,
    imgUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600',
    isPopular: true,
    authorEmail: 'quay@trasua.com',
    toppings: [],
  }
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
    return this.drinks.filter(d => d.name.toLowerCase().includes(lowerKey)) as Drink[];
  }

  async findOne(id: string): Promise<Drink | null> {
    return (this.drinks.find(d => d.id === id) as Drink) || null;
  }

  async update(id: string, dto: UpdateDrinkDto): Promise<Drink | null> {
    const index = this.drinks.findIndex(d => d.id === id);
    if (index === -1) return null;
    this.drinks[index] = { ...this.drinks[index], ...dto };
    return this.drinks[index] as Drink;
  }

  async remove(id: string): Promise<Drink | null> {
    const index = this.drinks.findIndex(d => d.id === id);
    if (index === -1) return null;
    const deleted = this.drinks[index];
    this.drinks.splice(index, 1);
    return deleted as Drink;
  }
}
```

**Màn ảo thuật thay đổi ruột Database:**
Bạn mở file `src/drink/drink.module.ts` lên. Ở phần `providers`, chỗ nào có chữ `MongooseDrinkRepository`, bạn đổi nó thành `InMemoryDrinkRepository`.

```typescript
providers: [
  DrinkService,
  { provide: DRINK_REPOSITORY, useClass: InMemoryDrinkRepository }, // <-- ĐỔI Ở ĐÂY
],
```

> [!TIP]
> 🛑 **Checkpoint D5**: Lúc này nếu bạn gọi API lấy danh sách đồ uống (bằng Postman hoặc `curl`), bạn sẽ thấy món đồ uống có chữ **(RAM)** xuất hiện, chứng tỏ API đang lấy dữ liệu từ RAM chứ không lấy từ MongoDB nữa. Dịch vụ (Service) và Khách (Controller) hoàn toàn không biết sự thay đổi này! Đỉnh chưa? 😎

---

## 🔗 D6: Nối hai project (Angular + NestJS)

(Nhớ đổi lại `useClass: MongooseDrinkRepository` trong `drink.module.ts` để lưu DB thật nha).

1. **Bật CORS bên NestJS**:
   Frontend Angular chạy ở cổng `4200`, Backend chạy ở `3000`. Trình duyệt sẽ chặn không cho giao tiếp trừ khi backend "cho phép".
   Mở file `src/main.ts` của NestJS, thêm dòng `.enableCors()`:
   ```typescript
   import { NestFactory } from '@nestjs/core';
   import { AppModule } from './app.module';

   async function bootstrap() {
     const app = await NestFactory.create(AppModule);
     
     // Bật CORS cho phép Angular truy cập (Cực kỳ quan trọng)
     app.enableCors();
     
     await app.listen(process.env.PORT ?? 3000);
   }
   bootstrap();
   ```

2. **Chỉnh sửa lại Angular (`btvnAngu`)**:
   - Vào project Angular của bạn, tìm file `DrinkService` (nơi đang lưu mảng ảo trên RAM).
   - Đổi hàm `getAllDrinks()` thay vì trả về mảng cứng, hãy gọi hàm `this.http.get<Drink[]>('http://localhost:3000/drinks')`.
   - Đảm bảo trong `app.config.ts` bên Angular đã cấu hình `provideHttpClient()`.

Thành quả cuối cùng: Khi bạn vào giao diện Web Angular, nó sẽ tự động lấy những cốc trà sữa xịn xò từ CSDL MongoDB của bạn để hiển thị lên! 🚀
