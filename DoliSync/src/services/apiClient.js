import axios from 'axios';

export const BASE_URL = '/api-dolibarr';
const API_KEY = 'a31031ec9f9fac9ae7d484c24a4b8cf78a5a8aaf'; 

export async function fetchDolData(resourcePath, options = {}) {
  const axiosConfig = {
    method: options.method || 'GET',
    url: `${BASE_URL}${resourcePath}`,
    headers: {
      'DOLAPIKEY': API_KEY,
      'Content-Type': 'application/json'
    },
    data: options.body
  };

  try {
    const response = await axios(axiosConfig);
    return response.data;
  } catch (error) {
    const errorText = error.response?.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    throw new Error(`Erreur API Dolibarr (Statut ${error.response?.status}) : ${errorText}`);
  }
}