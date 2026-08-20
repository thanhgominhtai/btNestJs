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
      formData.append('models', 'nudity-2.1,gore,offensive');
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

        const suggestiveClasses = nudity.suggestive_classes || {};
        const nudityArt = suggestiveClasses.nudity_art || 0;
        const lingerie = suggestiveClasses.lingerie || 0;
        const maleChest = suggestiveClasses.male_chest || 0;
        const visiblyUndressed = suggestiveClasses.visibly_undressed || 0;
        const cleavageVeryRevealing =
          suggestiveClasses.cleavage_categories?.very_revealing ||
          suggestiveClasses.cleavage ||
          0;

        const context = nudity.context || {};
        const isBeachOrPool =
          (context.sea_lake_pool || 0) > 0.45 || (context.outdoor_other || 0) > 0.55;

        const gore = data.gore?.prob || 0;
        const offensive = data.offensive?.prob || 0;
        const safeScore = nudity.none || 0;

        console.log(`[Sightengine AI Comprehensive Analysis: ${filename}]`, {
          sexualActivity,
          sexualDisplay,
          erotica,
          nudityArt,
          lingerie,
          maleChest,
          isBeachOrPool,
          gore,
          offensive,
          safeScore,
        });

        const actPct = Math.round(sexualActivity * 100);
        const dispPct = Math.round(sexualDisplay * 100);
        const eroPct = Math.round(erotica * 100);
        const artPct = Math.round(nudityArt * 100);
        const lingeriePct = Math.round(lingerie * 100);
        const safePct = Math.round(safeScore * 100);
        const gorePct = Math.round(gore * 100);
        const offPct = Math.round(offensive * 100);

        // 1. Strict 18+ Explicit Real-world Nudity / Sexual Acts
        if (sexualActivity > 0.38 || sexualDisplay > 0.38 || erotica > 0.45 || sextoy > 0.40) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            `⚠️ Ảnh bị chặn do vi phạm 18+ / Khoả thân! [Chi tiết: Khoả thân: ${dispPct}% | Khiêu dâm: ${eroPct}% | Quan hệ: ${actPct}% | An toàn: ${safePct}%]`,
          );
        }

        // 2. 2D / Anime / Manga 18+ (Hentai, Ecchi, Tranh vẽ khoả thân/khiêu gợi)
        if (nudityArt > 0.35 || (erotica > 0.35 && safeScore < 0.65)) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            `⚠️ Ảnh bị chặn do chứa tranh vẽ / Anime 18+ phản cảm! [Chi tiết: Tranh 18+: ${artPct}% | Khiêu dâm: ${eroPct}% | An toàn: ${safePct}%]`,
          );
        }

        // 3. Lewd Lingerie / Indecent Exposure Indoors (Excludes healthy Beach/Pool & Male Fitness)
        if (
          (lingerie > 0.60 || visiblyUndressed > 0.70 || cleavageVeryRevealing > 0.75) &&
          !isBeachOrPool &&
          maleChest < 0.50
        ) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            `⚠️ Ảnh bị chặn do chứa trang phục nội y / gợi cảm quá mức! [Chi tiết: Nội y: ${lingeriePct}% | An toàn: ${safePct}%]`,
          );
        }

        // 4. Violence / Blood / Gore / Animal cruelty
        if (gore > 0.50) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            `⚠️ Ảnh bị chặn do chứa nội dung bạo lực / máu me! [Chi tiết: Bạo lực: ${gorePct}% | An toàn: ${safePct}%]`,
          );
        }

        // 5. Offensive / Hate / Extremism
        if (offensive > 0.60) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          throw new BadRequestException(
            `⚠️ Ảnh bị chặn do chứa nội dung phản cảm hoặc thù địch! [Chi tiết: Phản cảm: ${offPct}% | An toàn: ${safePct}%]`,
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
