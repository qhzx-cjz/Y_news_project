import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthLoginDto } from './dto/auth-login.dto';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(dto: AuthLoginDto) {
    const exists = await prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await hash(dto.password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        nickname: `用户_${Math.floor(Math.random() * 1000)}`,
      },
    });

    return { msg: '注册成功', userId: newUser.id };
  }

  async login(dto: AuthLoginDto) {
    const user = await prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, username: user.username, avatar: user.avatar },
    };
  }

  async logout(logoutDto: { userId: number }) {
    return { msg: '登出成功' };
  }
}
