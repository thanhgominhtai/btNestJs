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
  private readonly apiUser = process.env.SIGHTENGINE_API_USER || '490010755';
  private readonly apiSecret = process.env.SIGHTENGINE_API_SECRET || 'jg2PX3FwoeyD7PUj2Syc7XnrnGKSpPZg';

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  /**
   * Scans uploaded image via Sightengine AI Content Moderation.
   * If NSFW (nudity, sexual activity, suggestive, gore) is detected:
   * 1. Deletes the file immediately from disk.
   * 2. Throws BadRequestException with clear explanatory message.
   */
  async validateImageModeration(filename: string): Promise<void> {
    const filePath = join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return;

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = extname(filename).toLowerCase().replace('.', '');
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const blob = new Blob([fileBuffer], { type: mimeType });

      const formData = new FormData();
      formData.append('media', blob, filename);
      formData.append('models', 'nudity-2.1,gore');
      formData.append('api_user', this.apiUser);
      formData.append('api_secret', this.apiSecret);

      const response = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.warn(`[Sightengine Moderation] HTTP Status: ${response.status}`);
        return; // Gracefully continue if external moderation API is temporarily offline
      }

      const data: any = await response.json();
      if (data.status === 'success') {
        const nudity = data.nudity || {};
        const sexualActivity = nudity.sexual_activity || 0;
        const sexualDisplay = nudity.sexual_display || 0;
        const erotica = nudity.erotica || 0;
        const sextoy = nudity.sextoy || 0;
        const verySuggestive = nudity.very_suggestive || 0;
        const suggestive = nudity.suggestive || 0;
        const gore = data.gore?.prob || 0;

        console.log(`[Sightengine AI Analysis: ${filename}]`, {
          sexualActivity,
          sexualDisplay,
          erotica,
          verySuggestive,
          suggestive,
          none: nudity.none,
          gore,
        });

        // 1. Extreme 18+ / Porn / Explicit Nudity / Sexual activity
        if (sexualActivity > 0.30 || sexualDisplay > 0.30 || erotica > 0.40 || sextoy > 0.35) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            '⚠️ Hình ảnh chứa nội dung 18+ / khoả thân nhạy cảm vi phạm chuẩn mực cộng đồng Starbucks. Vui lòng chọn hình ảnh khác!',
          );
        }

        // 2. Heavy suggestive / explicit revealing
        if (verySuggestive > 0.60 || (suggestive > 0.80 && nudity.none < 0.25)) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            '⚠️ Hình ảnh có tính chất hở hang hoặc quá gợi cảm không phù hợp. Vui lòng chọn hình ảnh khác!',
          );
        }

        // 3. Violence / Blood / Gore
        if (gore > 0.50) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            '⚠️ Hình ảnh chứa nội dung bạo lực hoặc máu me không phù hợp. Vui lòng chọn hình ảnh khác!',
          );
        }
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      console.error('[Sightengine Moderation Error]:', err);
    }
  }
}
