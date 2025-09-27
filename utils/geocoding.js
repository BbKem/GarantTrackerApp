export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ru&accept-language=ru`,
      {
        headers: {
          'User-Agent': 'GarantAppTracker (bboykam@list.ru)', 
        },
      }
    );
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Адрес не найден. Проверьте правильность.');
    }
    
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (error) {
    console.error('Ошибка геокодирования:', error);
    throw error;
  }
};