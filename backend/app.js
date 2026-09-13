import express from 'express';
import cors from 'cors';

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

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/products', productsRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/sales-orders', salesOrdersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/customer-payments', customerPaymentsRouter);
app.use('/api/supplier-payments', supplierPaymentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/company', companyRouter);

app.use((req, res, next) => {
  next(new ApiError(404, 'Not found.'));
});

app.use(errorHandler);

export default app;
