import { Router } from 'express';
import { createSettlement, getSettlements } from '../controllers/settlementController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', createSettlement);
router.get('/', getSettlements);

export default router;