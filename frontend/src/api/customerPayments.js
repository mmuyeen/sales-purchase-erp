import client from './client.js';

export const listCustomerPayments = (params) => client.get('/customer-payments', { params });
export const createCustomerPayment = (data) => client.post('/customer-payments', data);
