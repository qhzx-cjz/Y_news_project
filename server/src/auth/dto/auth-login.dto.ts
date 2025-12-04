import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class AuthLoginDto {
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(20, { message: '密码太长了' })
  password: string;
}
