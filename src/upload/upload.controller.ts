import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, multerImageOptions } from './upload.service';
import { CustomJwtAuthGuard } from '../common/guards/custom-jwt-auth.guard';

@Controller('upload')
@UseGuards(CustomJwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerImageOptions))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để tải lên');
    }

    // AI Content Moderation Check (Sightengine AI)
    await this.uploadService.validateImageModeration(file.filename);

    const url = this.uploadService.getFileUrl(file.filename);
    return {
      filename: file.filename,
      url,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
