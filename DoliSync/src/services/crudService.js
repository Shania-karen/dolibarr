import { fetchDolData } from './apiClient';

export const createCrudService = (endpoint) => {
  return {
    getAll: () => fetchDolData(endpoint),  
    getById: (id) => fetchDolData(`${endpoint}/${id}`),  
    create: (data) => fetchDolData(endpoint, { 
      method: 'POST', 
      body: data 
    }), 
    update: (id, data) => fetchDolData(`${endpoint}/${id}`, { 
      method: 'PUT', 
      body: data 
    }),  
    delete: (id) => fetchDolData(`${endpoint}/${id}`, { 
      method: 'DELETE' 
    })
  };
};