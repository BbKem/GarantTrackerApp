import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { update, ref as dbRef, onValue, off, get } from 'firebase/database';
import { db } from '../config';
import { showAlert, showConfirm } from '../utils/notifications';

const ProfileModal = ({ visible, user, onClose, onSignOut }) => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadArchivedTasks = async () => {
    if (!user || !user.username) return;
    
    setLoadingArchive(true);
    try {
      const archiveRef = dbRef(db, `archive/tasks`);
      const snapshot = await get(archiveRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allArchivedTasks = [];
        
        Object.entries(data).forEach(([workerId, workerTasks]) => {
          if (workerTasks && typeof workerTasks === 'object') {
            Object.entries(workerTasks).forEach(([taskId, taskData]) => {
              if (taskData && typeof taskData === 'object') {
                allArchivedTasks.push({
                  id: taskId,
                  assignedTo: workerId,
                  ...taskData
                });
              }
            });
          }
        });
        
        allArchivedTasks.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
        setArchivedTasks(allArchivedTasks);
      } else {
        setArchivedTasks([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки архива:', error);
      showAlert('Ошибка', 'Не удалось загрузить архив задач: ' + error.message);
    } finally {
      setLoadingArchive(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArchivedTasks();
  };

  const uploadImageAsBase64 = async (base64String) => {
    if (!user || !user.username) {
      showAlert('Ошибка', 'Пользователь не найден');
      return;
    }

    const base64Size = (base64String.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024;

    if (base64Size > maxSize) {
      showAlert('Слишком большое изображение', 'Пожалуйста, выберите фото меньшего размера');
      return;
    }

    setUploading(true);
    try {
      const base64Data = `data:image/jpeg;base64,${base64String}`;
      
      await update(dbRef(db, `users/${user.username}`), {
        photoURL: base64Data
      });

      setImage(base64Data);
      showAlert('Успех', 'Фото профиля обновлено!');
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showAlert('Ошибка', 'Не удалось сохранить фото. Попробуйте еще раз.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Для веба
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/jpg';
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              let base64 = reader.result;
              if (base64.includes(',')) {
                base64 = base64.split(',')[1];
              }
              await uploadImageAsBase64(base64);
            };
            reader.readAsDataURL(file);
          }
        };
        
        input.click();
        return;
      }
      
      // Для нативных платформ
      const { launchImageLibraryAsync, MediaTypeOptions } = await import('expo-image-picker');
      const { status } = await import('expo-image-picker').then(mod => mod.requestMediaLibraryPermissionsAsync());
      
      if (status !== 'granted') {
        showAlert('Разрешение требуется', 'Для выбора фото из галереи необходимо предоставить разрешение');
        return;
      }

      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
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
      showAlert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Для веба - используем тот же подход что и pick
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/jpg';
        input.capture = 'environment';
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              let base64 = reader.result;
              if (base64.includes(',')) {
                base64 = base64.split(',')[1];
              }
              await uploadImageAsBase64(base64);
            };
            reader.readAsDataURL(file);
          }
        };
        
        input.click();
        return;
      }
      
      // Для нативных платформ
      const { launchCameraAsync } = await import('expo-image-picker');
      const { status } = await import('expo-image-picker').then(mod => mod.requestCameraPermissionsAsync());
      
      if (status !== 'granted') {
        showAlert('Разрешение требуется', 'Для съемки фото необходимо предоставить доступ к камере');
        return;
      }

      const result = await launchCameraAsync({
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
      showAlert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const removeCurrentPhoto = async () => {
    if (!user || !user.username) return;

    try {
      await update(dbRef(db, `users/${user.username}`), {
        photoURL: null
      });
      
      setImage(null);
      showAlert('Успех', 'Фото профиля удалено');
    } catch (error) {
      console.error('Ошибка удаления фото:', error);
      showAlert('Ошибка', 'Не удалось удалить фото');
    }
  };

  const showImagePickerOptions = () => {
    if (uploading) {
      showAlert('Загрузка', 'Пожалуйста, дождитесь завершения текущей загрузки');
      return;
    }

    // Для веба - сразу открываем выбор файла
    if (Platform.OS === 'web') {
      handlePickImage();
      return;
    }

    // Для нативных платформ - показываем выбор
    Alert.alert(
      'Изменить фото профиля',
      'Выберите источник',
      [
        { text: 'Сделать фото', onPress: handleTakePhoto },
        { text: 'Выбрать из галереи', onPress: handlePickImage },
        { text: 'Удалить текущее фото', onPress: removeCurrentPhoto, style: 'destructive' },
        { text: 'Отмена', style: 'cancel' },
      ]
    );
  };

  const handleSignOut = () => {
    showConfirm('Выход', 'Вы уверены, что хотите выйти?', onSignOut);
  };

  const getAvatarSource = () => {
    if (image) {
      return { uri: image };
    }
    return user?.userType === 'admin' 
      ? { uri: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=Admin' }
      : { uri: 'https://via.placeholder.com/100x100/666666/FFFFFF?text=Worker' };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'нет данных';
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  const renderArchivedTask = ({ item }) => (
    <View style={styles.archivedTask}>
      <Text style={styles.archivedTaskTitle}>{item.title || 'Без названия'}</Text>
      
      <View style={styles.taskDetails}>
        <Text style={styles.taskDetail}><Text style={styles.detailLabel}>Адрес:</Text> {item.location || 'нет данных'}</Text>
        <Text style={styles.taskDetail}><Text style={styles.detailLabel}>Работник:</Text> {item.assignedTo || 'нет данных'}</Text>
        <Text style={styles.taskDetail}><Text style={styles.detailLabel}>Время задачи:</Text> {item.time || 'нет данных'}</Text>
        
        {item.assignedBy && (
          <Text style={styles.taskDetail}><Text style={styles.detailLabel}>Назначил:</Text> {item.assignedBy}</Text>
        )}
        
        {item.lastChecked && (
          <Text style={styles.taskDetail}><Text style={styles.detailLabel}>Прибытие:</Text> {formatDate(item.lastChecked)}</Text>
        )}
        
        {item.completedAt && (
          <Text style={styles.taskDetail}><Text style={styles.detailLabel}>Завершено:</Text> {formatDate(item.completedAt)}</Text>
        )}
        
        <Text style={styles.taskDetail}><Text style={styles.detailLabel}>В архиве с:</Text> {formatDate(item.archivedAt)}</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          item.isOnSite ? styles.statusOnSite : styles.statusOffSite
        ]}/>
        <Text style={styles.statusText}>
          {item.isOnSite ? 'Был(а) на месте' : 'Не подтверждена'}
        </Text>
        <Text style={[styles.completedBadge, styles.completed]}>
          Завершена
        </Text>
      </View>
    </View>
  );

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
            <Ionicons name="close" size={24} color="#8FA3BF" />
          </TouchableOpacity>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
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
                    <ActivityIndicator size="large" color="#1F4E8C" />
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
                <Ionicons name="person" size={20} color="#1F4E8C" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Логин</Text>
                  <Text style={styles.infoValue}>{user?.username}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="lock-closed" size={20} color="#1F4E8C" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Пароль</Text>
                  <Text style={styles.infoValue}>••••••••</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark" size={20} color="#1F4E8C" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Роль</Text>
                  <Text style={styles.infoValue}>
                    {user?.userType === 'admin' ? 'Администратор системы' : 'Работник'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="images" size={20} color="#1F4E8C" />
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

              {user?.userType === 'admin' && (
                <View style={styles.infoItem}>
                  <Ionicons name="archive" size={20} color="#1F4E8C" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Архив задач</Text>
                    <Text style={styles.infoValue}>Просмотр архивных задач</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => {
                      loadArchivedTasks();
                      setArchiveModalVisible(true);
                    }}
                  >
                    <Text style={styles.editButtonText}>Открыть</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleSignOut}
              disabled={uploading}
            >
              <Ionicons name="log-out" size={20} color="#FF6B6B" />
              <Text style={styles.logoutButtonText}>Выйти из системы</Text>
            </TouchableOpacity>
          </ScrollView>
          
          <Modal
            animationType="slide"
            transparent={true}
            visible={archiveModalVisible}
            onRequestClose={() => setArchiveModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={[styles.modalContent, styles.archiveModalContent]}>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setArchiveModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#8FA3BF" />
                </TouchableOpacity>
                
                <Text style={styles.modalTitle}>Архив задач</Text>
                <Text style={styles.archiveSubtitle}>
                  Всего архивных задач: {archivedTasks.length}
                </Text>
                
                {loadingArchive ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1F4E8C" />
                    <Text style={styles.loadingText}>Загрузка архива...</Text>
                  </View>
                ) : archivedTasks.length === 0 ? (
                  <View style={styles.emptyArchive}>
                    <Ionicons name="archive-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Архив пуст</Text>
                    <Text style={styles.emptySubtext}>
                      Завершенные задачи появятся здесь после выгрузки с опцией удаления
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={archivedTasks}
                    renderItem={renderArchivedTask}
                    keyExtractor={item => `${item.assignedTo}-${item.id}-${item.archivedAt}`}
                    style={styles.archiveList}
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#1F4E8C']}
                      />
                    }
                    contentContainerStyle={styles.archiveListContent}
                  />
                )}
              </View>
            </View>
          </Modal>
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
  archiveModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '95%',
    height: '85%',
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
    borderColor: '#1F4E8C',
    backgroundColor: '#E2E8F0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#1F4E8C',
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
    color: '#1F4E8C',
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
    color: '#8FA3BF',
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
    borderBottomColor: '#E2E8F0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8FA3BF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 15,
  },
  editButtonText: {
    fontSize: 12,
    color: '#1F4E8C',
    fontWeight: '500',
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
    color: '#FF6B6B',
    marginLeft: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  archiveSubtitle: {
    textAlign: 'center',
    color: '#8FA3BF',
    marginBottom: 15,
    fontSize: 14,
  },
  archiveList: {
    flex: 1,
    marginTop: 10,
  },
  archiveListContent: {
    paddingBottom: 20,
  },
  archivedTask: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  archivedTaskTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  taskDetails: {
    marginBottom: 10,
  },
  taskDetail: {
    fontSize: 14,
    color: '#8FA3BF',
    marginBottom: 4,
    lineHeight: 18,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusOnSite: {
    backgroundColor: '#4CAF50',
  },
  statusOffSite: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 13,
    color: '#8FA3BF',
    marginRight: 12,
  },
  completedBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  completed: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#8FA3BF',
    fontSize: 16,
  },
  emptyArchive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8FA3BF',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});

export default ProfileModal;