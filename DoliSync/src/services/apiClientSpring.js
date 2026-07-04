export async function fetchSpringData(resourcePath, options = {}) {
  const cleanPath = resourcePath.startsWith('/') ? resourcePath.slice(1) : resourcePath;
  const url = `/api/${cleanPath}`;
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if(!response.ok){
      const errorText = await response.text();
      throw new Error(`Erreur API Spring (Statut ${response.status}) : ${errorText}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const jsonData = await response.json();
      console.log(`Données reçues de Spring pour ${resourcePath} :`, jsonData);
      return jsonData;
    }
    return null;
  } catch (error) {
    console.error(`Erreur ${options.method || 'GET'} sur ${resourcePath} :`, error);
    throw error;
  }
}