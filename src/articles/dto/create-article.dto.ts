import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ example: 'My First Article' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'This is a short description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Full article content goes here...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  content: string;
}
