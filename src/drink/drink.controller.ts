import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
} from '@nestjs/common';
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
  @HttpCode(204) // Khi xóa thành công, trả về status 204 No Content
  async remove(@Param('id') id: string) {
    await this.drinkService.remove(id);
  }
}
