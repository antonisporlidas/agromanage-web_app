import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Προστατευμένο route: επιστρέφει το ποιος είναι συνδεδεμένος
router.get('/me', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Έχεις πρόσβαση!',
    user: req.user
  });
});

export default router;