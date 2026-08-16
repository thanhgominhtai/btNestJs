import { IsOptional, IsString } from 'class-validator';

export class SearchRecipeDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
