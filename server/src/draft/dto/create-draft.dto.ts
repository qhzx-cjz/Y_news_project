import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDraftDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  content: string;
}

