import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

// 文章数据类型（包含新字段 likes 和 views）
// 注意：运行 `npx prisma generate` 后可以使用 @prisma/client 的类型
interface ArticleData {
  id: number;
  title: string;
  content: string;
  authorId: number;
  likes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: number;
    username: string;
    avatar: string | null;
  } | null;
}

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  // 发布文章
  async publish(authorId: number, dto: CreateArticleDto) {
    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return this.formatArticle(article as unknown as ArticleData);
  }

  // 获取文章列表（分页）
  async list(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.article.count(),
    ]);

    return {
      articles: (articles as unknown as ArticleData[]).map((article) => {
        return this.formatArticle(article);
      }),
      total,
    };
  }

  // 获取单篇文章
  async getById(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    return this.formatArticle(article as unknown as ArticleData);
  }

  // 更新文章（二次编辑）
  async update(id: number, authorId: number, dto: UpdateArticleDto) {
    // 检查文章是否存在
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 检查是否是作者本人
    if (article.authorId !== authorId) {
      throw new ForbiddenException('只能编辑自己的文章');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return this.formatArticle(updated as unknown as ArticleData);
  }

  // 删除文章
  async delete(id: number, authorId: number) {
    // 检查文章是否存在
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 检查是否是作者本人
    if (article.authorId !== authorId) {
      throw new ForbiddenException('只能删除自己的文章');
    }

    await this.prisma.article.delete({
      where: { id },
    });

    return { msg: '文章已删除' };
  }

  // 增加浏览量
  async incrementViews(id: number) {
    await this.prisma
      .$executeRaw`UPDATE Article SET views = views + 1 WHERE id = ${id}`;
  }

  // 点赞文章
  async like(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    await this.prisma
      .$executeRaw`UPDATE Article SET likes = likes + 1 WHERE id = ${id}`;

    const currentLikes = (article as unknown as ArticleData).likes ?? 0;
    return { likes: currentLikes + 1 };
  }

  // 格式化文章输出
  private formatArticle(article: ArticleData) {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      authorId: article.authorId,
      author: article.author
        ? {
            id: article.author.id,
            username: article.author.username,
            avatar: article.author.avatar,
          }
        : undefined,
      likes: article.likes ?? 0,
      views: article.views ?? 0,
      createdAt:
        article.createdAt instanceof Date
          ? article.createdAt.toISOString()
          : String(article.createdAt),
      updatedAt:
        article.updatedAt instanceof Date
          ? article.updatedAt.toISOString()
          : String(article.updatedAt),
    };
  }
}
