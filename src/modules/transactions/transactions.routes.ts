import { Router } from 'express';
import { TransactionsController } from './transactions.controller';
import { authenticate } from '../../middleware/authenticate';
import { adminOnly, anyRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createTransactionSchema, updateTransactionSchema } from './transactions.schema';

const router = Router();
const controller = new TransactionsController();

// READ — all authenticated users (VIEWER, ANALYST, ADMIN)
router.get('/',    authenticate, anyRole, controller.findAll.bind(controller));
router.get('/:id', authenticate, anyRole, controller.findById.bind(controller));

// WRITE — ADMIN only
router.post('/',     authenticate, adminOnly, validate(createTransactionSchema), controller.create.bind(controller));
router.patch('/:id', authenticate, adminOnly, validate(updateTransactionSchema), controller.update.bind(controller));
router.delete('/:id',authenticate, adminOnly, controller.delete.bind(controller));

export default router;