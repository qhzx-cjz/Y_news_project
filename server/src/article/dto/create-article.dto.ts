import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(255, { message: '标题最长255个字符' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  @MinLength(1, { message: '内容不能为空' })
  content: string;
}

