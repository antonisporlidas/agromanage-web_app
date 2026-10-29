import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} from '../controllers/expenseController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', createExpense);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;