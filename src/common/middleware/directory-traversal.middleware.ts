import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DirectoryTraversalMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const checkTraversal = (value: unknown): boolean => {
      if (typeof value === 'string') {
        const decoded = decodeURIComponent(value);
        return (
          decoded.includes('../') ||
          decoded.includes('..\\') ||
          decoded.includes('..%2f') ||
          decoded.includes('..%5c') ||
          /\.\.[\/\\]/.test(decoded)
        );
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some((v) => checkTraversal(v));
      }
      return false;
    };

    if (checkTraversal(req.originalUrl) || checkTraversal(req.query) || checkTraversal(req.params)) {
      throw new BadRequestException('Potential directory traversal attack detected.');
    }

    next();
  }
}
