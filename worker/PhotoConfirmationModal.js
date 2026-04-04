// worker/PhotoConfirmationModal.js - обновлённый стиль
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { ref, push, set } from 'firebase/database';
import { db } from '../config';
import { showAlert } from '../utils/notifications';
import { takePhoto } from '../utils/imagePicker';

const PhotoConfirmationModal = ({ 
  visible, 
  onClose, 
  task, 
  user,
  confirmationType,
  onSuccess 
}) => {
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!task || !user) {
    return null;
  }

  const handleTakePhoto = async () => {
    try {
      const result = await takePhoto();
      if (!result.canceled && result.assets && result.assets[0]) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Ошибка съемки:', error);
      showAlert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const submitPhotoConfirmation = async () => {
    if (!photo) {
      showAlert('Ошибка', 'Сначала сделайте фото');
      return;
    }

    setUploading(true);
    try {
      const confirmationRef = ref(db, 'photoConfirmations');
      const newConfirmationRef = push(confirmationRef);
      
      await set(newConfirmationRef, {
        taskId: task.id,
        taskTitle: task.title || 'Без названия',
        workerId: user.username,
        workerName: user.username,
        photo: `data:image/jpeg;base64,${photo.base64}`,
        type: confirmationType, 
        timestamp: Date.now(),
        status: 'pending', 
        attempts: task.photoConfirmationAttempts || 1,
        location: task.location || 'Адрес не указан'
      });
      
      showAlert('Успех', 'Фото отправлено на проверку администратору');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка отправки:', error);
      showAlert('Ошибка', 'Не удалось отправить фото');
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    handleTakePhoto();
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
          {/* Заголовок */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>📸</Text>
            </View>
            <Text style={styles.title}>
              {confirmationType === 'arrival' 
                ? 'Подтверждение прибытия'
                : 'Подтверждение завершения'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Информация о задаче */}
          <View style={styles.taskCard}>
            <Text style={styles.taskName}>{task.title || 'Задача'}</Text>
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.taskAddress}>{task.location || 'Адрес не указан'}</Text>
            </View>
          </View>

          {/* Фото */}
          {!photo ? (
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleTakePhoto}
              disabled={uploading}
            >
              <View style={styles.cameraIconCircle}>
                <Text style={styles.cameraEmoji}>📷</Text>
              </View>
              <Text style={styles.cameraButtonText}>Сделать фото</Text>
              <Text style={styles.cameraHint}>Сфотографируйте объект или вывеску</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo.uri }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={retakePhoto}
              >
                <Text style={styles.retakeButtonText}>🔄 Переснять</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Инструкция */}
          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>📋 Важно:</Text>
            <Text style={styles.instructionText}>
              • Сфотографируйте объект или его номер\n
              • Убедитесь, что фото четкое и узнаваемое\n
              • Администратор проверит фото в течение 5 минут
            </Text>
          </View>

          {/* Кнопка отправки */}
          {photo && (
            <TouchableOpacity 
              style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
              onPress={submitPhotoConfirmation}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Отправить на проверку</Text>
                  <Text style={styles.submitButtonIcon}>→</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerEmoji: {
    fontSize: 24,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#8FA3BF',
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: '#F8FAFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  taskAddress: {
    flex: 1,
    fontSize: 13,
    color: '#8FA3BF',
  },
  cameraButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#F8FAFE',
    marginBottom: 20,
  },
  cameraIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraEmoji: {
    fontSize: 32,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F4E8C',
    marginBottom: 4,
  },
  cameraHint: {
    fontSize: 12,
    color: '#8FA3BF',
  },
  photoPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F4F7FB',
  },
  retakeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F4F7FB',
    borderRadius: 20,
  },
  retakeButtonText: {
    fontSize: 13,
    color: '#1F4E8C',
    fontWeight: '500',
  },
  instructions: {
    backgroundColor: '#FFF8E7',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE8B6',
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: '#E65100',
  },
  instructionText: {
    fontSize: 12,
    color: '#8FA3BF',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PhotoConfirmationModal;