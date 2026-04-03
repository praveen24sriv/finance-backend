import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { adminOnly } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema } from './users.schema';

const router = Router();
const controller = new UsersController();

// All user management routes require authentication + admin role
// authenticate → verify JWT; adminOnly → verify role

router.get('/',        authenticate, adminOnly, controller.findAll.bind(controller));
router.get('/:id',     authenticate, adminOnly, controller.findById.bind(controller));
router.post('/',       authenticate, adminOnly, validate(createUserSchema), controller.create.bind(controller));
router.patch('/:id',   authenticate, adminOnly, validate(updateUserSchema), controller.update.bind(controller));
router.delete('/:id',  authenticate, adminOnly, controller.delete.bind(controller));

// Audit log for a specific user — admin only
router.get('/:id/audit-logs', authenticate, adminOnly, controller.getAuditLogs.bind(controller));

export default router;