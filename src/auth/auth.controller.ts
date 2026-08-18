import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ReactivateAccountDto } from './dto/reactivate-account.dto';
import { SendRestoreOtpDto, ConfirmRestoreOtpDto } from './dto/restore-account.dto';
import { OverwriteAccountDto } from './dto/overwrite-account.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Public()
  @Post('reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Body() dto: ReactivateAccountDto) {
    return this.authService.reactivateAccount(dto);
  }

  @Public()
  @Post('send-restore-otp')
  @HttpCode(HttpStatus.OK)
  sendRestoreOtp(@Body() dto: SendRestoreOtpDto) {
    return this.authService.sendRestoreOtp(dto);
  }

  @Public()
  @Post('confirm-restore-otp')
  @HttpCode(HttpStatus.OK)
  confirmRestoreOtp(@Body() dto: ConfirmRestoreOtpDto) {
    return this.authService.confirmRestoreOtp(dto);
  }

  @Public()
  @Post('overwrite-account')
  @HttpCode(HttpStatus.OK)
  overwriteAccount(@Body() dto: OverwriteAccountDto) {
    return this.authService.overwriteAccount(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: Partial<RefreshTokenDto>) {
    return this.authService.logout(dto.refreshToken);
  }
}
