import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import fieldRoutes from './routes/fieldRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'AgroManage API is running!' });
});

// Auth endpoints
app.use('/api/auth', authRoutes);
app.use('/api/fields', fieldRoutes);

export default app;