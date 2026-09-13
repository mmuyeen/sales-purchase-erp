import client from './client.js';

export const listSalesOrders = (params) => client.get('/sales-orders', { params });
export const getSalesOrder = (id) => client.get(`/sales-orders/${id}`);
export const createSalesOrder = (data) => client.post('/sales-orders', data);
export const updateSalesOrder = (id, data) => client.put(`/sales-orders/${id}`, data);
export const updateSalesOrderStatus = (id, status) => client.put(`/sales-orders/${id}/status`, { status });
export const deleteSalesOrder = (id) => client.delete(`/sales-orders/${id}`);
