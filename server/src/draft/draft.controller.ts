import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { DraftService } from './draft.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('draft')
@UseGuards(JwtAuthGuard) // 所有草稿接口都需要登录
export class DraftController {
  constructor(private readonly draftService: DraftService) {}

  // GET /draft - 获取当前用户的草稿
  @Get()
  async getDraft(@CurrentUser() user: CurrentUserPayload) {
    const draft = await this.draftService.getDraft(user.sub);
    if (!draft) {
      throw new NotFoundException('暂无草稿');
    }
    return draft;
  }

  // POST /draft - 保存草稿
  @Post()
  async saveDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDraftDto,
  ) {
    return this.draftService.saveDraft(user.sub, dto);
  }

  // DELETE /draft - 删除草稿
  @Delete()
  async deleteDraft(@CurrentUser() user: CurrentUserPayload) {
    return this.draftService.deleteDraft(user.sub);
  }
}
