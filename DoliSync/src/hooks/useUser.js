import { useState, useEffect } from 'react';
import { fetchDolData } from '../services/apiClient';

export function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchDolData('/users?expand_dropdowns=true')
      .then(setUsers)
      .catch(err => console.error("Erreur users :", err));
  }, []);

  return { users };
}