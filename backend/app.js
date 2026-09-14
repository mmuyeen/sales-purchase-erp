import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import suppliersRouter from './routes/suppliers.js';
import productsRouter from './routes/products.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import salesOrdersRouter from './routes/salesOrders.js';
import invoicesRouter from './routes/invoices.js';
import customerPaymentsRouter from './routes/customerPayments.js';
import supplierPaymentsRouter from './routes/supplierPayments.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';
import companyRouter from './routes/company.js';
import { ApiError } from './middleware/ApiError.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sales Purchase API is running'
  });
});
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Public (no auth required)
app.use('/api/auth', authRouter);

// Every route below requires a valid authenticated session, and every
// controller behind them filters/validates by req.user.id — never a
// client-supplied user_id.
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/suppliers', requireAuth, suppliersRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/purchase-orders', requireAuth, purchaseOrdersRouter);
app.use('/api/sales-orders', requireAuth, salesOrdersRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);
app.use('/api/customer-payments', requireAuth, customerPaymentsRouter);
app.use('/api/supplier-payments', requireAuth, supplierPaymentsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/company', requireAuth, companyRouter);

app.use((req, res, next) => {
  next(new ApiError(404, 'Not found.'));
});

app.use(errorHandler);

export default app;
