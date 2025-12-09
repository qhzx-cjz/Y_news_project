import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  // POST /articles - 发布文章（需要登录）
  @Post()
  @UseGuards(JwtAuthGuard)
  async publish(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateArticleDto,
  ) {
    return this.articleService.publish(user.sub, dto);
  }

  // GET /articles - 获取文章列表（公开）
  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // 限制每页最多50条
    const safeLimit = Math.min(limit, 50);
    return this.articleService.list(page, safeLimit);
  }

  // GET /articles/:id - 获取单篇文章（公开）
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    // 增加浏览量
    await this.articleService.incrementViews(id);
    return this.articleService.getById(id);
  }

  // POST /articles/:id/like - 点赞文章（公开）
  @Post(':id/like')
  async like(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.like(id);
  }

  // PUT /articles/:id - 更新文章（需要登录）
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articleService.update(id, user.sub, dto);
  }

  // DELETE /articles/:id - 删除文章（需要登录）
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articleService.delete(id, user.sub);
  }
}
