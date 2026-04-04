// utils/imagePicker.js
import { Platform } from 'react-native';

// Универсальная съемка фото
export const takePhoto = async () => {
  // Для веба
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg';
      input.capture = 'environment';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Получаем base64 без префикса data:image...
            let base64 = reader.result;
            if (base64.includes(',')) {
              base64 = base64.split(',')[1];
            }
            resolve({
              canceled: false,
              assets: [{
                uri: reader.result,
                base64: base64,
                width: 800,
                height: 600
              }]
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve({ canceled: true, assets: [] });
        }
      };
      
      input.oncancel = () => {
        resolve({ canceled: true, assets: [] });
      };
      
      input.click();
    });
  }
  
  // Для нативных платформ
  try {
    const { launchCameraAsync } = await import('expo-image-picker');
    const result = await launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    return result;
  } catch (error) {
    console.error('Error taking photo:', error);
    return { canceled: true, assets: [] };
  }
};

// Универсальный выбор изображений
export const pickImage = async () => {
  // Для веба
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            let base64 = reader.result;
            if (base64.includes(',')) {
              base64 = base64.split(',')[1];
            }
            resolve({
              canceled: false,
              assets: [{
                uri: reader.result,
                base64: base64,
                width: 800,
                height: 600
              }]
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve({ canceled: true, assets: [] });
        }
      };
      
      input.oncancel = () => {
        resolve({ canceled: true, assets: [] });
      };
      
      input.click();
    });
  }
  
  // Для нативных платформ
  try {
    const { launchImageLibraryAsync, MediaTypeOptions } = await import('expo-image-picker');
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    return result;
  } catch (error) {
    console.error('Error picking image:', error);
    return { canceled: true, assets: [] };
  }
};