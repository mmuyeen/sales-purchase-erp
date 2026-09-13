import client from './client.js';

export const listSupplierPayments = (params) => client.get('/supplier-payments', { params });
export const createSupplierPayment = (data) => client.post('/supplier-payments', data);
