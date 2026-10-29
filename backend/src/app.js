import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import fieldRoutes from './routes/fieldRoutes.js';
import cropCycleRoutes from './routes/cropCycleRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import settlementRoutes from "./routes/settlementRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
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
app.use('/api/crop-cycles', cropCycleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expense', expenseRoutes);
export default app;