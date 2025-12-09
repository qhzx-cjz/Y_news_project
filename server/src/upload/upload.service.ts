import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 上传文件的类型定义
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// 支持的图片类型
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// 文件大小限制 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor() {
    // 上传目录设置为 server/uploads
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  // 确保上传目录存在
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // 生成唯一 ID
  private generateUniqueId(): string {
    return crypto.randomUUID();
  }

  // 上传图片
  async uploadImage(
    file: UploadedFile,
  ): Promise<{ url: string; filename: string }> {
    // 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        '不支持的图片格式，请上传 JPG、PNG、GIF 或 WebP 格式',
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    // 生成唯一文件名
    const ext = path.extname(file.originalname);
    const filename = `${this.generateUniqueId()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // 保存文件
    await fs.promises.writeFile(filePath, file.buffer);

    // 返回可访问的 URL
    return {
      url: `/uploads/${filename}`,
      filename,
    };
  }

  // 删除图片
  async deleteImage(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
