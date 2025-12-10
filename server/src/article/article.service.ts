import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

// 标签数据类型
interface TagData {
  id: number;
  name: string;
}

// 文章数据类型（包含新字段 likes、views 和 tags）
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
  tags?: TagData[];
}

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 从内容中提取标签
   * 匹配 #标签名 格式，标签名支持中文、英文、数字、下划线
   * 标签以空格、换行或其他非标签字符结束
   */
  private extractTags(content: string): string[] {
    // 先移除 HTML 标签，避免匹配到 HTML 属性中的 #
    const textContent = content.replace(/<[^>]+>/g, ' ');
    // 匹配 #标签 格式，标签名支持中英文、数字、下划线，长度 1-50
    const tagRegex = /#([\u4e00-\u9fa5a-zA-Z0-9_]{1,50})(?=\s|$|[^\u4e00-\u9fa5a-zA-Z0-9_#])/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(textContent)) !== null) {
      const tagName = match[1].toLowerCase(); // 统一小写
      if (!tags.includes(tagName)) {
        tags.push(tagName);
      }
    }
    return tags;
  }

  /**
   * 创建或获取标签，返回标签 ID 列表
   */
  private async getOrCreateTags(tagNames: string[]): Promise<{ id: number }[]> {
    if (tagNames.length === 0) return [];

    // 使用 upsert 确保标签存在
    const tagPromises = tagNames.map(async (name) => {
      const tag = await this.prisma.tag.upsert({
        where: { name },
        update: {}, // 已存在则不更新
        create: { name },
        select: { id: true },
      });
      return tag;
    });

    return Promise.all(tagPromises);
  }

  // 发布文章
  async publish(authorId: number, dto: CreateArticleDto) {
    // 从内容中提取标签
    const tagNames = this.extractTags(dto.content);
    const tags = await this.getOrCreateTags(tagNames);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId,
        tags: {
          connect: tags, // 关联标签
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
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
          tags: {
            select: {
              id: true,
              name: true,
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
        tags: {
          select: {
            id: true,
            name: true,
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

    // 从新内容中提取标签（如果有内容更新）
    const tagNames = dto.content ? this.extractTags(dto.content) : [];
    const tags = await this.getOrCreateTags(tagNames);

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        tags: {
          set: tags, // 重新设置标签关联（先断开所有，再连接新的）
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
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
      tags: article.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })) ?? [],
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
