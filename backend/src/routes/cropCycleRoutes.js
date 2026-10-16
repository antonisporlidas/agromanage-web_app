import { Router } from 'express';
import {
  createCropCycle,
  getCropCycles,
  getCropCycleById,
  updateCropCycle,
  deleteCropCycle
} from '../controllers/cropCycleController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Όλα τα routes προστατεύονται με JWT
router.use(authenticateToken);

router.post('/', createCropCycle);
router.get('/', getCropCycles);
router.get('/:id', getCropCycleById);
router.put('/:id', updateCropCycle);
router.delete('/:id', deleteCropCycle);

export default router;