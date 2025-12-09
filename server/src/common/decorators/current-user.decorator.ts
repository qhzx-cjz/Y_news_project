import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

// 获取当前登录用户的装饰器
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);

// 用户信息类型
export interface CurrentUserPayload {
  sub: number; // userId
  username: string;
}
