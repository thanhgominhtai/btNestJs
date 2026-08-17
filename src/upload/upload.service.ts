import { Injectable, BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const multerImageOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      // Sanitize filename to avoid any path traversal
      const uniqueName = `${crypto.randomUUID()}${ext}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
      return cb(
        new BadRequestException('Chỉ chấp nhận file ảnh định dạng jpg, jpeg, png, gif, webp, svg'),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
};

@Injectable()
export class UploadService {
  getFileUrl(filename: string): string {
    const baseUrl =
      process.env.APP_URL ||
      process.env.BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/uploads/${filename}`;
  }
}
