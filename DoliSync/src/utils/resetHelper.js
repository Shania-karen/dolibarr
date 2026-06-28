import { fetchDolData } from '../services/apiClient';

export const purgeSelectedTables = async (endpoints, onProgress) => {
  let totalDeleted = 0;

  const priorityOrder = [
    'salaries/payments',
    'salaries',
    'holidays',
    'expensereports',
    'products',
    'warehouses',
    'users'
  ];

  const sortedEndpoints = [...endpoints].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    return posA - posB;
  });

  const runInBatches = async (items, batchSize, asyncFn) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(asyncFn));
    }
  };

  for (const endpoint of sortedEndpoints) {
    try {
      
      const rawItems = await fetchDolData(`/${endpoint}?limit=1000&sortfield=t.rowid&sortorder=ASC`, { 
        method: 'GET' 
      });
      
      const items = Array.isArray(rawItems) ? rawItems : [];

      if (items.length === 0) {
        console.log(`Aucune donnée à supprimer dans ${endpoint}.`);
        continue;
      }

      let localDeleted = 0;

      await runInBatches(items, 10, async (item) => {
        const itemId = item.id;

       
        if (endpoint === 'users' && (itemId === 1 || itemId === "1" || item.admin === "1")) {
          console.warn("Purge : Évitement de la suppression du compte Administrateur principal.");
          return;
        }

        try {
          const deleteUrl = endpoint === 'salaries/payments' 
            ? `/salaries/${itemId}/payments` 
            : `/${endpoint}/${itemId}`;

          await fetchDolData(deleteUrl, {
            method: 'DELETE'
          });

          localDeleted++;
          totalDeleted++;

          if (onProgress) {
            onProgress(`Purge en cours : ${endpoint}`, localDeleted, items.length);
          }
        } catch (err) {
          console.error(`Échec de la suppression de l'ID ${itemId} dans ${endpoint}`, err);
          
        }
      });

    } catch (error) {
      console.error(`Erreur lors de la lecture de la table ${endpoint} :`, error);
      throw new Error(`Impossible de lire les données pour ${endpoint}.`);
    }
  }

  return totalDeleted;
};