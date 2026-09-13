import client from './client.js';

export const listSuppliers = (params) => client.get('/suppliers', { params });
export const getSupplier = (id) => client.get(`/suppliers/${id}`);
export const createSupplier = (data) => client.post('/suppliers', data);
export const updateSupplier = (id, data) => client.put(`/suppliers/${id}`, data);
export const deactivateSupplier = (id) => client.delete(`/suppliers/${id}`);
