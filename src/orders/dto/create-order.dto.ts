import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'Recipe ID không được để trống' })
  @IsString()
  recipeId: string;

  @IsNotEmpty({ message: 'Số khẩu phần không được để trống' })
  @IsNumber()
  @Min(1, { message: 'Tối thiểu 1 khẩu phần' })
  @Max(50, { message: 'Tối đa 50 khẩu phần' })
  portions: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  desiredTime?: string;
}
