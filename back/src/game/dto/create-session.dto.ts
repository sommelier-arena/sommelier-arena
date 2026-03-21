import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['color', 'country', 'grape_variety', 'vintage_year'])
  category!: string;

  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  distractors!: string[];
}

export class WineDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  questions!: QuestionDto[];
}

export class CreateSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WineDto)
  @ArrayMinSize(1)
  wines!: WineDto[];
}
