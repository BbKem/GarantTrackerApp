import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { update, ref as dbRef, onValue, off } from 'firebase/database';
import { db } from '../config';

const ProfileModal = ({ visible, user, onClose, onSignOut }) => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Загружаем фото пользователя при открытии модального окна
  useEffect(() => {
    if (user && user.username) {
      const userRef = dbRef(db, `users/${user.username}`);
      
      const unsubscribe = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.photoURL) {
          setImage(userData.photoURL);
        }
      });

      return () => off(userRef, 'value', unsubscribe);
    }
  }, [user, visible]);

  const pickImage = async () => {
    try {
      // Запрашиваем разрешения
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Разрешение требуется',
          'Для выбора фото из галереи необходимо предоставить разрешение.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Открываем галерею
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImageAsBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Ошибка выбора изображения:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const takePhoto = async () => {
    try {
      // Запрашиваем разрешения для камеры
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Разрешение требуется',
          'Для съемки фото необходимо предоставить доступ к камере.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Открываем камеру
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImageAsBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Ошибка съемки фото:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const uploadImageAsBase64 = async (base64String) => {
    if (!user || !user.username) {
      Alert.alert('Ошибка', 'Пользователь не найден');
      return;
    }

    // Проверяем размер base64 строки (Firebase имеет ограничения)
    const base64Size = (base64String.length * 3) / 4; // Примерный расчет размера в байтах
    const maxSize = 5 * 1024 * 1024; // 5MB - безопасный лимит для Firebase

    if (base64Size > maxSize) {
      Alert.alert(
        'Слишком большое изображение',
        'Пожалуйста, выберите фото меньшего размера или уменьшите качество.',
        [{ text: 'OK' }]
      );
      return;
    }

    setUploading(true);
    try {
      // Создаем data URL
      const base64Data = `data:image/jpeg;base64,${base64String}`;
      
      console.log('Сохраняем фото пользователя:', user.username);
      
      // Сохраняем в Firebase Realtime Database
      await update(dbRef(db, `users/${user.username}`), {
        photoURL: base64Data
      });

      setImage(base64Data);
      Alert.alert('Успех', 'Фото профиля обновлено!');
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      
      if (error.message && error.message.includes('max size')) {
        Alert.alert(
          'Ошибка', 
          'Изображение слишком большое. Выберите другое фото меньшего размера.'
        );
      } else {
        Alert.alert('Ошибка', 'Не удалось сохранить фото. Попробуйте еще раз.');
      }
    } finally {
      setUploading(false);
    }
  };

  const showImagePickerOptions = () => {
    if (uploading) {
      Alert.alert('Загрузка', 'Пожалуйста, дождитесь завершения текущей загрузки');
      return;
    }

    Alert.alert(
      'Изменить фото профиля',
      'Выберите источник',
      [
        {
          text: 'Сделать фото',
          onPress: takePhoto,
        },
        {
          text: 'Выбрать из галереи',
          onPress: pickImage,
        },
        {
          text: 'Удалить текущее фото',
          onPress: removeCurrentPhoto,
          style: 'destructive',
        },
        {
          text: 'Отмена',
          style: 'cancel',
        },
      ]
    );
  };

  const removeCurrentPhoto = async () => {
    if (!user || !user.username) return;

    try {
      await update(dbRef(db, `users/${user.username}`), {
        photoURL: null
      });
      
      setImage(null);
      Alert.alert('Успех', 'Фото профиля удалено');
    } catch (error) {
      console.error('Ошибка удаления фото:', error);
      Alert.alert('Ошибка', 'Не удалось удалить фото');
    }
  };

  const getAvatarSource = () => {
    if (image) {
      return { uri: image };
    }
    // Заглушки для разных типов пользователей
    return user?.userType === 'admin' 
      ? { uri: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=Admin' }
      : { uri: 'https://via.placeholder.com/100x100/666666/FFFFFF?text=Worker' };
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image 
                source={getAvatarSource()}
                style={styles.avatar}
              />
              <TouchableOpacity 
                style={[
                  styles.cameraButton,
                  uploading && styles.cameraButtonDisabled
                ]}
                onPress={showImagePickerOptions}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.uploadingText}>Загрузка...</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileName}>{user?.username}</Text>
            <Text style={styles.profileRole}>
              {user?.userType === 'admin' ? 'Администратор' : 'Работник'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Логин</Text>
                <Text style={styles.infoValue}>{user?.username}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="lock-closed" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Пароль</Text>
                <Text style={styles.infoValue}>••••••••</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Изменить</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Роль</Text>
                <Text style={styles.infoValue}>
                  {user?.userType === 'admin' ? 'Администратор системы' : 'Работник'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="images" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Фото профиля</Text>
                <Text style={styles.infoValue}>
                  {image ? 'Загружено' : 'Не загружено'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={showImagePickerOptions}
              >
                <Text style={styles.editButtonText}>
                  {image ? 'Изменить' : 'Добавить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={onSignOut}
              disabled={uploading}
            >
              <Ionicons name="log-out" size={20} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Выйти из системы</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 5,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#007AFF',
    backgroundColor: '#f0f0f0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  cameraButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 5,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  profileInfo: {
    marginBottom: 30,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  editButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  profileActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
});

export default ProfileModal;