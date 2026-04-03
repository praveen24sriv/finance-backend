import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { UserQueryInput, userQuerySchema } from './users.schema';

const usersService = new UsersService();

export class UsersController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.create(req.body, req.user!.id);
      res.status(201).json(ApiResponse.ok('User created', user));
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = userQuerySchema.parse(req.query) as UserQueryInput;
      const result = await usersService.findAll(query);
      res.json(ApiResponse.ok('Users fetched', result.users, result.meta));
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.findById(req.params.id);
      res.json(ApiResponse.ok('User fetched', user));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.update(req.params.id, req.body, req.user!.id);
      res.json(ApiResponse.ok('User updated', user));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.delete(req.params.id, req.user!.id);
      res.json(ApiResponse.ok(result.message));
    } catch (err) { next(err); }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.getAuditLogs(
        req.params.id,
        req.query as { page?: string; limit?: string }
      );
      res.json(ApiResponse.ok('Audit logs fetched', result.logs, result.meta));
    } catch (err) { next(err); }
  }
}