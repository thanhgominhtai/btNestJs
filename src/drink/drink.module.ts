import { Module } from '@nestjs/common';
import { DrinkService } from './drink.service';
import { DrinkController } from './drink.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Drink, DrinkSchema } from './entities/drink.entity';
import { DRINK_REPOSITORY } from './drink.repository.interface';
// import { InMemoryDrinkRepository } from './in-memory-drink.repository';
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
