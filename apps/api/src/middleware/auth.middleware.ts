import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@feature-os/config';
import { Role, Permission, hasPermission, AuthenticatedUserPayload } from '@feature-os/types';
import { AppError } from './error.middleware';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUserPayload;
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing or malformed authorization header.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUserPayload;
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token', 401));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(
        new AppError(
          `Forbidden. Role '${user.role}' lacks sufficient privileges. Required: [${allowedRoles.join(', ')}]`,
          403,
        ),
      );
    }

    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!hasPermission(user.role, permission)) {
      return next(
        new AppError(
          `Forbidden. Role '${user.role}' lacks the required permission: '${permission}'`,
          403,
        ),
      );
    }

    next();
  };
}
