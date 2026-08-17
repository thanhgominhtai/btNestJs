import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
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
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async getProfile(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
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
    const user = await this.userModel.findByIdAndDelete(userId);
    if (!user) throw new NotFoundException('User not found');

    // Remove tokens
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) });

    return { message: 'Tài khoản đã được xoá vĩnh viễn' };
  }

  async getAdmins(keyword?: string) {
    const query: any = { role: Role.ADMIN };
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
    const query: any = {};
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

    // Safe-guard: Check if admin is removing their own admin role
    if (targetUserId === currentAdminId && newRole === Role.USER) {
      const adminCount = await this.userModel.countDocuments({ role: Role.ADMIN });
      if (adminCount <= 1) {
        throw new ForbiddenException('Không thể thu hồi quyền của Admin duy nhất trong hệ thống');
      }
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
