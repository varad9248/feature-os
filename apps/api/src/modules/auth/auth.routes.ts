import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { authenticateJWT } from '../../middleware/auth.middleware';
import {
  RegisterInputSchema,
  LoginInputSchema,
  RefreshTokenInputSchema,
} from '@feature-os/types';

export const authRouter: Router = Router();

authRouter.post(
  '/register',
  validateRequest({ body: RegisterInputSchema }),
  AuthController.register,
);

authRouter.post(
  '/login',
  validateRequest({ body: LoginInputSchema }),
  AuthController.login,
);

authRouter.post(
  '/refresh',
  validateRequest({ body: RefreshTokenInputSchema }),
  AuthController.refresh,
);

authRouter.post(
  '/logout',
  authenticateJWT,
  AuthController.logout,
);

authRouter.get(
  '/me',
  authenticateJWT,
  AuthController.getMe,
);
