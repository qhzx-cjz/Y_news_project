import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // 允许跨域

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // 自动去除 DTO 中未定义的属性
  }));

  await app.listen(process.env.PORT ?? 9080);
}
bootstrap();
