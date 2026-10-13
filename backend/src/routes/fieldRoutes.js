import { Router } from 'express';
import {
  createField,
  getMyFields,
  getFieldById,
  updateField,
  deleteField,
} from '../controllers/fieldController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Όλα τα routes παραμένουν προστατευμένα με το JWT middleware
router.post('/', authenticateToken, createField);
router.get('/', authenticateToken, getMyFields);
router.get('/:id', authenticateToken, getFieldById);
router.put('/:id', authenticateToken, updateField);
router.delete('/:id', authenticateToken, deleteField);

export default router;