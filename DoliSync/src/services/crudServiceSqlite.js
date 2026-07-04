import { fetchSpringData } from './apiClientSpring';

export const createCrudService = (endpoint) => {
  return {
    getAll: () => fetchSpringData(endpoint),  
    getById: (id) => fetchSpringData(`${endpoint}/${id}`),  
    create: (data) => fetchSpringData(endpoint, { 
      method: 'POST', 
      body: data 
    }), 
    update: (id, data) => fetchSpringData(`${endpoint}/${id}`, { 
      method: 'PUT', 
      body: data 
    }),  
    delete: (id) => fetchSpringData(`${endpoint}/${id}`, { 
      method: 'DELETE' 
    })
  };
};