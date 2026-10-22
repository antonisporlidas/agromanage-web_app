import { Router } from 'express';
import { createCustomer, getCustomers } from '../controllers/customerController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router     = Router();
router.use(authenticateToken);

router.post('/', createCustomer);
router.get('/', getCustomers);

export default router;