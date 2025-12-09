import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import type { UploadedFile as UploadedFileType } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file: UploadedFileType) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const result = await this.uploadService.uploadImage(file);
    return result;
  }
}
