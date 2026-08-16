import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ToppingDto {
  @IsNotEmpty({ message: 'Tên topping không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty({ message: 'Đơn vị không được để trống' })
  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class CreateRecipeDto {
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString()
  description: string;

  @IsNotEmpty({ message: 'Giá cơ bản không được để trống' })
  @IsNumber()
  @Min(0, { message: 'Giá cơ bản phải lớn hơn hoặc bằng 0' })
  giaCoBan: number;

  @IsNotEmpty({ message: 'Ảnh món không được để trống' })
  @IsString()
  imgUrl: string;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  authorEmail?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToppingDto)
  toppings?: ToppingDto[];
}
