import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { loginSchema, registerSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

// Routes are declarations only — no logic
// Middleware chain reads left to right: rateLimiter → validate → controller

router.post('/register', validate(registerSchema), controller.register.bind(controller));
router.post('/login', authRateLimiter, validate(loginSchema), controller.login.bind(controller));
router.post('/logout', authenticate, controller.logout.bind(controller));
router.get('/profile', authenticate, controller.getProfile.bind(controller));

export default router;