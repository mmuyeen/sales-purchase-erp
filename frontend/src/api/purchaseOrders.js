import client from './client.js';

export const listPurchaseOrders = (params) => client.get('/purchase-orders', { params });
export const getPurchaseOrder = (id) => client.get(`/purchase-orders/${id}`);
export const createPurchaseOrder = (data) => client.post('/purchase-orders', data);
export const updatePurchaseOrder = (id, data) => client.put(`/purchase-orders/${id}`, data);
export const updatePurchaseOrderStatus = (id, status) => client.put(`/purchase-orders/${id}/status`, { status });
export const deletePurchaseOrder = (id) => client.delete(`/purchase-orders/${id}`);
