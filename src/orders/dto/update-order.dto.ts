import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Tối thiểu 1 khẩu phần' })
  @Max(50, { message: 'Tối đa 50 khẩu phần' })
  portions?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  desiredTime?: string;
}
