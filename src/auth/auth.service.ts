import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/entities/user.entity';
import { Role } from '../common/decorators/roles.decorator';
import { CustomJwtService } from './custom-jwt.service';
import { RefreshToken, RefreshTokenDocument } from './entities/refresh-token.entity';
import { PasswordReset, PasswordResetDocument } from './entities/password-reset.entity';
import { MailService } from './mail.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

import { ReactivateAccountDto } from './dto/reactivate-account.dto';
import { SendRestoreOtpDto, ConfirmRestoreOtpDto } from './dto/restore-account.dto';
import { OverwriteAccountDto } from './dto/overwrite-account.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(PasswordReset.name) private readonly passwordResetModel: Model<PasswordResetDocument>,
    private readonly jwtService: CustomJwtService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existingAdmin = await this.userModel.findOne({ email: 'admin@starbucks.vn' });
    if (!existingAdmin) {
      const hashed = await bcrypt.hash('admin123', 10);
      await this.userModel.create({
        name: 'Starbucks Store Manager',
        email: 'admin@starbucks.vn',
        password: hashed,
        role: Role.ADMIN,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      });
      console.log('⚡ [SEED] Đã khởi tạo Admin mặc định: admin@starbucks.vn / admin123');
    }

    const existingUser = await this.userModel.findOne({ email: 'user@starbucks.vn' });
    if (!existingUser) {
      const hashed = await bcrypt.hash('user123', 10);
      await this.userModel.create({
        name: 'Khách Hàng Thân Thiết',
        email: 'user@starbucks.vn',
        password: hashed,
        role: Role.USER,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      });
      console.log('⚡ [SEED] Đã khởi tạo User mẫu: user@starbucks.vn / user123');
    }
  }

  private async generateTokens(user: UserDocument) {
    const userId = user._id.toString();
    const accessToken = this.jwtService.sign({
      userId,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.refreshTokenModel.create({
      token: refreshTokenString,
      userId: user._id,
      expiresAt: refreshExpiresAt,
      isRevoked: false,
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl || '',
      },
    };
  }

  async signUp(dto: SignUpDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      if (existing.isDeleted) {
        // Tài khoản đã từng tồn tại và đang bị xóa mềm
        return {
          isDeactivatedAccount: true,
          email: existing.email,
          name: existing.name,
          message: 'Email này từng có tài khoản trước đây và đang trong trạng thái tạm ngưng. Bạn có muốn khôi phục lại dữ liệu cũ hay tạo mới tinh?',
        };
      }
      throw new ConflictException('Email này đã được đăng ký trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    // Mọi tài khoản đăng ký mới luôn luôn có vai trò là USER
    const newUser = new this.userModel({
      name: dto.name.trim(),
      email,
      password: hashedPassword,
      role: Role.USER,
      isDeleted: false,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
    });

    await newUser.save();
    return this.generateTokens(newUser);
  }

  async signIn(dto: SignInDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Nếu tài khoản đang trong trạng thái xóa mềm
    if (user.isDeleted) {
      return {
        isDeactivatedAccount: true,
        email: user.email,
        name: user.name,
        message: 'Tài khoản của bạn đang trong trạng thái tạm ngưng (Xóa mềm). Bạn có muốn kích hoạt lại để sử dụng ngay không?',
      };
    }

    return this.generateTokens(user);
  }

  async reactivateAccount(dto: ReactivateAccountDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu không chính xác để kích hoạt lại tài khoản');
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    return this.generateTokens(user);
  }

  async sendRestoreOtp(dto: SendRestoreOtpDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email, isDeleted: true });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản tạm ngưng nào ứng với email này');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.restoreOtp = otp;
    user.restoreOtpExpires = expiresAt;
    await user.save();

    await this.mailService.sendOtpEmail(user.email, otp, 'Khôi phục tài khoản');

    console.log(`[AUTH-RESTORE] Đã tạo mã OTP khôi phục tài khoản cho ${user.email}: ${otp}`);

    return {
      message: `Mã OTP khôi phục tài khoản đã được gửi đến ${user.email} (hiệu lực 10 phút). Vui lòng kiểm tra hộp thư của bạn.`,
      email: user.email,
    };
  }

  async confirmRestoreOtp(dto: ConfirmRestoreOtpDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({
      email,
      isDeleted: true,
      restoreOtp: dto.otp.trim(),
      restoreOtpExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Mã OTP khôi phục không hợp lệ hoặc đã hết hạn');
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.restoreOtp = null;
    user.restoreOtpExpires = null;

    if (dto.newPassword && dto.newPassword.trim().length >= 6) {
      user.password = await bcrypt.hash(dto.newPassword.trim(), 10);
    }

    await user.save();
    return this.generateTokens(user);
  }

  async overwriteAccount(dto: OverwriteAccountDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email, isDeleted: true });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản để tạo mới');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    user.name = dto.name.trim();
    user.password = hashedPassword;
    user.favorites = [];
    user.isDeleted = false;
    user.deletedAt = null;
    user.restoreOtp = null;
    user.restoreOtpExpires = null;
    user.avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    await user.save();
    return this.generateTokens(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const rawEmail = dto.email ? dto.email.trim() : '';
    // Tìm kiếm email không phân biệt hoa thường hoặc khoảng trắng
    const user = await this.userModel.findOne({
      $or: [
        { email: rawEmail.toLowerCase() },
        { email: new RegExp(`^${rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    });

    if (!user) {
      throw new NotFoundException(`Email "${rawEmail}" chưa được đăng ký trong hệ thống`);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.passwordResetModel.create({
      email: user.email,
      otp,
      expiresAt,
      isUsed: false,
    });

    // Gửi email OTP thực tế nếu đã cấu hình SMTP
    await this.mailService.sendOtpEmail(user.email, otp);

    console.log(`[AUTH] Đã tạo mã OTP cho email ${user.email}: ${otp}`);

    return {
      message: `Mã OTP khôi phục mật khẩu đã được gửi đến email ${user.email} (hiệu lực 10 phút). Vui lòng kiểm tra hộp thư của bạn.`,
      email: user.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const record = await this.passwordResetModel
      .findOne({
        email: dto.email.toLowerCase().trim(),
        otp: dto.otp.trim(),
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 });

    if (!record) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    record.resetToken = resetToken;
    await record.save();

    return {
      message: 'Xác thực OTP thành công. Vui lòng nhập mật khẩu mới.',
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.passwordResetModel.findOne({
      resetToken: dto.resetToken,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new BadRequestException('Reset token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userModel.findOne({ email: record.email });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await user.save();

    record.isUsed = true;
    await record.save();

    // Revoke all existing refresh tokens for security
    await this.refreshTokenModel.updateMany({ userId: user._id }, { isRevoked: true });

    return {
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const tokenDoc = await this.refreshTokenModel.findOne({
      token: dto.refreshToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    tokenDoc.isRevoked = true;
    await tokenDoc.save();

    const user = await this.userModel.findById(tokenDoc.userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không còn tồn tại');
    }

    return this.generateTokens(user);
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokenModel.updateOne({ token: refreshToken }, { isRevoked: true });
    }
    return { message: 'Đăng xuất thành công' };
  }
}
