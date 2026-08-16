import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface JwtSignOptions {
  expiresIn?: string | number; // e.g., '1h', '7d', or seconds
}

export interface CustomJwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

@Injectable()
export class CustomJwtService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('JWT_SECRET') || 'default_recipe_jwt_secret_key_2026';
  }

  /**
   * Helper to convert Base64 string to Base64URL string (RFC 7515)
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Helper to decode Base64URL string back to UTF-8
   */
  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  /**
   * Parse duration string like '15m', '1h', '7d' to seconds
   */
  private parseDuration(duration: string | number): number {
    if (typeof duration === 'number') return duration;
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1 hour
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  /**
   * [BE-03] Sign a JWT token manually with HMAC-SHA256
   */
  sign(payload: CustomJwtPayload, options?: JwtSignOptions): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = options?.expiresIn
      ? this.parseDuration(options.expiresIn)
      : this.parseDuration(this.configService.get<string>('JWT_EXPIRES_IN') || '7d');

    const fullPayload: CustomJwtPayload = {
      ...payload,
      iat: nowInSeconds,
      exp: nowInSeconds + expiresInSeconds,
    };

    const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${headerEncoded}.${payloadEncoded}`;

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(dataToSign)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
  }

  /**
   * [BE-03] Verify token signature and check expiration date
   */
  verify(token: string): CustomJwtPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Token is missing or invalid');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid JWT structure');
    }

    const [headerEncoded, payloadEncoded, signatureProvided] = parts;
    const dataToVerify = `${headerEncoded}.${payloadEncoded}`;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(dataToVerify)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time compare
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signatureProvided),
      Buffer.from(expectedSignature),
    );

    if (!isSignatureValid) {
      throw new UnauthorizedException('Invalid JWT signature');
    }

    // Decode and parse payload
    try {
      const payloadJson = this.base64UrlDecode(payloadEncoded);
      const payload = JSON.parse(payloadJson) as CustomJwtPayload;

      // Check exp
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowInSeconds) {
        throw new UnauthorizedException('Token has expired');
      }

      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Malformed token payload');
    }
  }
}
