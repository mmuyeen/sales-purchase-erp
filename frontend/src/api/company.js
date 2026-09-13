import client from './client.js';

export const getCompanyInfo = () => client.get('/company');
