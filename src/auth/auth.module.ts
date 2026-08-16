import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CustomJwtService } from './custom-jwt.service';
import { MailService } from './mail.service';
import { User, UserSchema } from '../users/entities/user.entity';
import { RefreshToken, RefreshTokenSchema } from './entities/refresh-token.entity';
import { PasswordReset, PasswordResetSchema } from './entities/password-reset.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, CustomJwtService, MailService],
  exports: [AuthService, CustomJwtService, MailService],
})
export class AuthModule {}
