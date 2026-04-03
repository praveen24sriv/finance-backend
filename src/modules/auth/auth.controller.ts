import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../utils/ApiResponse';

// Controllers are thin. They:
// 1. Extract data from the request
// 2. Call the service
// 3. Send the response
// No business logic lives here.

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.register(req.body);
      res.status(201).json(ApiResponse.ok('User registered successfully', user));
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.login(req.body, ipAddress, userAgent);
      res.status(200).json(ApiResponse.ok('Login successful', result));
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await authService.logout(req.user!.id, ipAddress);
      res.status(200).json(ApiResponse.ok(result.message));
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.status(200).json(ApiResponse.ok('Profile fetched', user));
    } catch (err) {
      next(err);
    }
  }
}