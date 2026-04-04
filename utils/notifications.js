// utils/notifications.js
import { Platform, Alert } from 'react-native';

// Универсальная функция для показа уведомлений
export const showAlert = (title, message, buttons = null) => {
  // Для веба
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // Находим кнопку подтверждения
      const confirmButton = buttons.find(b => 
        b.style === 'destructive' || 
        b.text === 'Подтвердить' || 
        b.text === 'Удалить' ||
        b.text === 'Сделать фото'
      );
      const cancelButton = buttons.find(b => 
        b.style === 'cancel' || 
        b.text === 'Отмена'
      );
      
      if (confirmButton && confirmButton.onPress) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          confirmButton.onPress();
        } else if (cancelButton && cancelButton.onPress) {
          cancelButton.onPress();
        }
        return;
      }
    }
    
    window.alert(`${title}\n\n${message}`);
    return;
  }
  
  // Для нативных платформ
  if (buttons) {
    Alert.alert(title, message, buttons);
  } else {
    Alert.alert(title, message);
  }
};

// Универсальная функция для подтверждения действия
export const showConfirm = (title, message, onConfirm, onCancel) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: 'Отмена', onPress: onCancel, style: 'cancel' },
        { text: 'Подтвердить', onPress: onConfirm, style: 'destructive' }
      ]
    );
  }
};