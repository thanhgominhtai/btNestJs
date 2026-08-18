import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.config.get<number>('SMTP_PORT', 587));
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`📧 Mailer đã kích hoạt gửi email thực tế qua: ${user}`);
    } else {
      this.logger.warn(
        '⚠️ SMTP chưa cấu hình SMTP_USER / SMTP_PASS trong .env - Mã OTP sẽ được in ra console log server và hiển thị devOtp.',
      );
    }
  }

  async sendOtpEmail(to: string, otp: string, purpose: string = 'Khôi phục mật khẩu'): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[SIMULATE EMAIL] [${purpose}] Đã tạo mã OTP cho ${to}: ${otp}`);
      return false;
    }

    try {
      const fromUser = this.config.get<string>('SMTP_USER');
      await this.transporter.sendMail({
        from: `"Starbucks Coffee" <${fromUser}>`,
        to,
        subject: `☕ [Starbucks] Mã OTP ${purpose}: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 28px; border: 1px solid #edebe9; border-radius: 16px; background-color: #faf6ee;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #006241; margin: 0; font-size: 22px; letter-spacing: 0.05em;">STARBUCKS COFFEE</h2>
              <p style="color: #666; font-size: 13px; margin: 4px 0 0;">Dịch vụ xác thực tài khoản & ${purpose}</p>
            </div>
            <p style="color: #1e3932; font-size: 15px; font-weight: bold;">Xin chào,</p>
            <p style="color: #333; font-size: 14px; line-height: 1.6;">
              Hệ thống nhận được yêu cầu <b>${purpose.toLowerCase()}</b> cho tài khoản <b>${to}</b>. Vui lòng sử dụng mã OTP 6 chữ số dưới đây để tiếp tục:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #006241; background: #ffffff; padding: 14px 28px; border-radius: 14px; border: 2px dashed #00754a; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                ${otp}
              </div>
            </div>
            <p style="color: #c82014; font-size: 13px; text-align: center; font-weight: bold;">
              ⚠️ Mã OTP này có hiệu lực trong vòng 10 phút. Tuyệt đối không chia sẻ mã này cho người khác.
            </p>
            <hr style="border: none; border-top: 1px solid #e0dedc; margin: 20px 0;" />
            <p style="color: #888; font-size: 11px; text-align: center;">
              Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này để bảo vệ an toàn tài khoản.
            </p>
          </div>
        `,
      });
      this.logger.log(`✅ Đã gửi email OTP (${purpose}) thực tế thành công tới: ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`❌ Gửi email OTP thất bại tới ${to}: ${err.message}`);
      return false;
    }
  }
}
