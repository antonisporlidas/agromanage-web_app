import { Router } from 'express';
import {
  createSettlement,
  getSettlements,
  getSettlementById,
  deleteSettlement
} from '../controllers/settlementController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', createSettlement);
router.get('/', getSettlements);
router.get('/:id', getSettlementById);
router.delete('/:id', deleteSettlement);

export default router;