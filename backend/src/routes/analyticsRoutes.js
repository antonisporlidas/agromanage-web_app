import { Router } from 'express';
import {
  getAvailableYears,
  getDashboardOverview,
  getCropPerformance,
  getCustomerSummary
} from '../controllers/analyticsController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/years', getAvailableYears);
router.get('/overview', getDashboardOverview);
router.get('/crop-performance', getCropPerformance);
router.get('/customer-summary', getCustomerSummary);

export default router;