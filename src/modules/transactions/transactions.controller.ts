import { Request, Response, NextFunction } from 'express';
import { TransactionsService } from './transactions.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { TransactionQueryInput, transactionQuerySchema } from './transactions.schema';

const transactionsService = new TransactionsService();

export class TransactionsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = transactionQuerySchema.parse(req.query) as TransactionQueryInput;
      const result = await transactionsService.findAll(query);
      res.json(ApiResponse.ok('Transactions fetched', result.transactions, result.meta));
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await transactionsService.findById(req.params.id);
      res.json(ApiResponse.ok('Transaction fetched', transaction));
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await transactionsService.create(req.body, req.user!.id);
      res.status(201).json(ApiResponse.ok('Transaction created', transaction));
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transaction = await transactionsService.update(req.params.id, req.body, req.user!.id);
      res.json(ApiResponse.ok('Transaction updated', transaction));
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await transactionsService.delete(req.params.id, req.user!.id);
      res.json(ApiResponse.ok(result.message));
    } catch (err) {
      next(err);
    }
  }
}
