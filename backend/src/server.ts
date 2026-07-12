import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRouter from './routes/auth';
import setupRouter from './routes/setup';
import assetsRouter from './routes/assets';
import allocationsRouter from './routes/allocations';
import bookingsRouter from './routes/bookings';
import maintenanceRouter from './routes/maintenance';
import auditsRouter from './routes/audits';
import analyticsRouter from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
app.use(express.json());

// Routes registry
app.use('/api/auth', authRouter);
app.use('/api/setup', setupRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/audits', auditsRouter);
app.use('/api/analytics', analyticsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AssetFlow ERP API', timestamp: new Date() });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Boot listening
app.listen(PORT, () => {
  console.log(`[Server] AssetFlow backend successfully started on port ${PORT}`);
});
