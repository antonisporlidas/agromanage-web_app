import { Router } from 'express';
import {
  createField,
  getMyFields,
  getFieldById,
  getFieldWeather,
  updateField,
  deleteField,
} from '../controllers/fieldController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();


// Εφαρμόζει το authentication σε ΟΛΑ τα παρακάτω routes αυτόματα
router.use(authenticateToken);

router.post('/', createField);
router.get('/', getMyFields);
router.get('/:id', getFieldById);
router.get('/:id/weather', getFieldWeather);
router.put('/:id', updateField);
router.delete('/:id', deleteField);

export default router;