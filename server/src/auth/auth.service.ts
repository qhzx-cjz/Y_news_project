import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client'; // 引入 Prisma 客户端
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthLoginDto } from './dto/auth-login.dto';

const prisma = new PrismaClient(); // 初始化数据库连接

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // 1. 注册逻辑
  async register(dto: AuthLoginDto) {
    // 先检查用户是否存在
    const exists = await prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }

    // 密码加密
    const hashedPassword = await hash(dto.password, 10);

    // 写入数据库
    const newUser = await prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        nickname: `用户_${Math.floor(Math.random() * 1000)}`,
      },
    });

    return { msg: '注册成功', userId: newUser.id };
  }

  // 2. 登录逻辑
  async login(dto: AuthLoginDto) {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 校验密码
    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 Token
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, username: user.username, avatar: user.avatar },
    };
  }

  // 3. 登出逻辑
  async logout(logoutDto: { userId: number }) {
    // 这里可以实现一些登出逻辑，比如记录日志等
    return { msg: '登出成功' };
  }
}
