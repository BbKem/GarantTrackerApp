export const formatAddress = (addressData) => {
  try {
      if (!addressData) return '';
    
    if (addressData.address) {
      const addr = addressData.address;
      const parts = [];
      
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village);
      }
      
      if (addr.road) {
        parts.push(addr.road);
      }
      
      if (addr.house_number) {
        parts.push(addr.house_number);
      }
      
      return parts.join(', ');
    }
    
    if (addressData.display_name) {
      return addressData.display_name.split(',')[0];
    }
    
    return '';
  } catch (error) {
    console.error('Error formatting address:', error);
    return addressData.display_name || '';
  }
};