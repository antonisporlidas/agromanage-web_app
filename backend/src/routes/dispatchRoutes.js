import { Router } from 'express';
import {
  getAvailableHarvests,
  createDispatchNote,
  getDispatchNotes
} from '../controllers/dispatchController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/available-harvests', getAvailableHarvests);
router.post('/', createDispatchNote);
router.get('/', getDispatchNotes);

export default router;