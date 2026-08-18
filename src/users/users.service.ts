import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './entities/user.entity';
import { Role } from '../common/decorators/roles.decorator';
import { RefreshToken, RefreshTokenDocument } from '../auth/entities/refresh-token.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    // 90-Day Retention Policy: Xoá cứng vĩnh viễn các tài khoản đã xóa mềm quá 90 ngày
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.userModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: ninetyDaysAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 [CLEANUP] Đã xóa cứng ${result.deletedCount} tài khoản hết hạn lưu giữ 90 ngày.`);
    }
  }

  async getProfile(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const newEmail = dto.email ? dto.email.toLowerCase().trim() : undefined;

    // Nếu thay đổi email, bắt buộc phải xác minh Mật khẩu hiện tại
    if (newEmail && newEmail !== user.email) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Vui lòng nhập Mật khẩu hiện tại để xác minh bảo mật khi thay đổi Email đăng nhập',
        );
      }

      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Mật khẩu hiện tại không chính xác. Không thể đổi Email');
      }

      const existing = await this.userModel.findOne({
        email: newEmail,
        _id: { $ne: user._id },
      });
      if (existing) {
        throw new ConflictException('Email này đã được sử dụng bởi tài khoản khác trong hệ thống');
      }

      user.email = newEmail;
    }

    if (dto.name) {
      user.name = dto.name.trim();
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    await user.save();
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await user.save();

    // Revoke old tokens
    await this.refreshTokenModel.updateMany({ userId: user._id }, { isRevoked: true });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async deleteAccount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.email.toLowerCase() === 'admin@starbucks.vn') {
      throw new ForbiddenException('Không thể xoá tài khoản Quản trị viên gốc của hệ thống (admin@starbucks.vn)');
    }

    // Soft Delete: Gắn cờ xóa mềm và lưu thời điểm xóa để áp dụng chính sách ân hạn 90 ngày
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // Hủy toàn bộ refresh token để lập tức đăng xuất
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) });

    return { message: 'Tài khoản đã được chuyển sang trạng thái tạm ngưng (Xóa mềm - Lưu giữ 90 ngày)' };
  }

  async getAdmins(keyword?: string) {
    const query: any = { role: Role.ADMIN, isDeleted: { $ne: true } };
    if (keyword && keyword.trim()) {
      const key = keyword.trim();
      query.$or = [
        { name: { $regex: key, $options: 'i' } },
        { email: { $regex: key, $options: 'i' } },
      ];
    }
    return this.userModel.find(query).sort({ createdAt: -1 });
  }

  async getAllUsers(keyword?: string) {
    const query: any = { isDeleted: { $ne: true } };
    if (keyword && keyword.trim()) {
      const key = keyword.trim();
      query.$or = [
        { name: { $regex: key, $options: 'i' } },
        { email: { $regex: key, $options: 'i' } },
      ];
    }
    return this.userModel.find(query).sort({ createdAt: -1 });
  }

  async updateRole(targetUserId: string, currentAdminId: string, newRole: Role) {
    if (!Types.ObjectId.isValid(targetUserId)) throw new NotFoundException('User not found');
    const targetUser = await this.userModel.findById(targetUserId);
    if (!targetUser) throw new NotFoundException('Target user not found');

    // Rule 1: Root / Super Admin (admin@starbucks.vn) cannot have admin role revoked
    if (targetUser.email.toLowerCase() === 'admin@starbucks.vn' && newRole !== Role.ADMIN) {
      throw new ForbiddenException('Không được phép thu hồi quyền Quản trị viên gốc (admin@starbucks.vn)');
    }

    // Rule 2: Current admin cannot revoke their own admin role
    if (targetUserId === currentAdminId && newRole !== Role.ADMIN) {
      throw new ForbiddenException('Bạn không thể tự thu hồi quyền Quản trị viên của chính mình');
    }

    targetUser.role = newRole;
    await targetUser.save();
    return targetUser;
  }

  async getFavorites(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId).select('favorites');
    if (!user) throw new NotFoundException('User not found');
    return user.favorites || [];
  }

  async toggleFavorite(userId: string, recipeId: string): Promise<{ isFavorite: boolean; favorites: string[] }> {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.favorites) {
      user.favorites = [];
    }

    const index = user.favorites.indexOf(recipeId);
    let isFavorite = false;
    if (index > -1) {
      user.favorites.splice(index, 1);
      isFavorite = false;
    } else {
      user.favorites.push(recipeId);
      isFavorite = true;
    }

    await user.save();
    return { isFavorite, favorites: user.favorites };
  }
}
