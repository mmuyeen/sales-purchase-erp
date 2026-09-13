import client from './client.js';

export const getDashboardSummary = () => client.get('/dashboard/summary');
