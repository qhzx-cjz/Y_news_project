import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDraftDto } from './dto/create-draft.dto';

@Injectable()
export class DraftService {
  constructor(private prisma: PrismaService) {}

  // 获取用户的草稿
  async getDraft(userId: number) {
    const draft = await this.prisma.draft.findUnique({
      where: { userId },
    });

    if (!draft) {
      return null;
    }

    return {
      id: draft.id,
      title: draft.title,
      content: draft.content,
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  // 保存草稿（创建或更新）
  async saveDraft(userId: number, dto: CreateDraftDto) {
    const draft = await this.prisma.draft.upsert({
      where: { userId },
      update: {
        title: dto.title,
        content: dto.content,
      },
      create: {
        userId,
        title: dto.title,
        content: dto.content,
      },
    });

    return {
      id: draft.id,
      title: draft.title,
      content: draft.content,
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  // 删除草稿
  async deleteDraft(userId: number) {
    try {
      await this.prisma.draft.delete({
        where: { userId },
      });
      return { msg: '草稿已删除' };
    } catch {
      // 草稿不存在也返回成功
      return { msg: '草稿已删除' };
    }
  }
}
