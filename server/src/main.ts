import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 配置 CORS 跨域
  app.enableCors({
    origin: [
      'http://localhost:3000',
      /\.vercel\.app$/,  // 允许所有 vercel.app 子域名
    ],
    credentials: true,
  });

  // 配置静态文件服务，用于访问上传的图片
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动去除 DTO 中未定义的属性
    }),
  );

  await app.listen(process.env.PORT ?? 9080);
}
void bootstrap();
