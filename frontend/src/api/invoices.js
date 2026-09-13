import client from './client.js';

export const listInvoices = (params) => client.get('/invoices', { params });
export const getInvoice = (id) => client.get(`/invoices/${id}`);
export const createInvoice = (data) => client.post('/invoices', data);
export const updateInvoice = (id, data) => client.put(`/invoices/${id}`, data);
export const updateInvoiceStatus = (id, status) => client.put(`/invoices/${id}/status`, { status });
export const deleteInvoice = (id) => client.delete(`/invoices/${id}`);
