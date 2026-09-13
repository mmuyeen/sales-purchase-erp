import client from './client.js';

export const getSalesReport = (params) => client.get('/reports/sales', { params });
export const getPurchaseOrderReport = (params) => client.get('/reports/purchase-orders', { params });
export const getProductSalesPaymentReport = (params) => client.get('/reports/product-sales-payments', { params });
