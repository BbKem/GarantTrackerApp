// admin/PhotoConfirmationsTab.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../config';
import { Ionicons } from '@expo/vector-icons';

const PhotoConfirmationsTab = () => {
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const confirmationsRef = ref(db, 'photoConfirmations');
    
    const unsubscribe = onValue(confirmationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const confirmationsList = Object.entries(data)
          .map(([id, confirmation]) => ({
            id,
            ...confirmation
          }))
          .filter(c => c.status === 'pending')
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setConfirmations(confirmationsList);
      } else {
        setConfirmations([]);
      }
      setLoading(false);
    });

    return () => off(confirmationsRef);
  }, []);

  const handleApprove = async (confirmation) => {
    Alert.alert(
      'Подтверждение',
      `Подтвердить ${confirmation.type === 'arrival' ? 'прибытие' : 'завершение'} задачи?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Подтвердить',
          onPress: async () => {
            try {
              await update(ref(db, `photoConfirmations/${confirmation.id}`), {
                status: 'approved',
                approvedAt: Date.now(),
                approvedBy: 'admin'
              });

              const taskUpdates = {};
              if (confirmation.type === 'arrival') {
                taskUpdates[`tasks/${confirmation.workerId}/${confirmation.taskId}/isOnSite`] = true;
                taskUpdates[`tasks/${confirmation.workerId}/${confirmation.taskId}/lastChecked`] = new Date().toISOString();
                taskUpdates[`tasks/${confirmation.workerId}/${confirmation.taskId}/confirmedByPhoto`] = true;
              } else {
                taskUpdates[`tasks/${confirmation.workerId}/${confirmation.taskId}/completed`] = true;
                taskUpdates[`tasks/${confirmation.workerId}/${confirmation.taskId}/completedAt`] = new Date().toISOString();
                taskUpdates[`tasks/${confirmation.workerId}/${confirmation.taskId}/completedByPhoto`] = true;
              }

              await update(ref(db), taskUpdates);
              Alert.alert('Успех', 'Подтверждение принято');
            } catch (error) {
              console.error('Ошибка подтверждения:', error);
              Alert.alert('Ошибка', 'Не удалось подтвердить');
            }
          }
        }
      ]
    );
  };

  const handleReject = async (confirmationId) => {
    Alert.alert(
      'Отклонение',
      'Вы уверены, что хотите отклонить этот запрос?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отклонить',
          style: 'destructive',
          onPress: async () => {
            try {
              await update(ref(db, `photoConfirmations/${confirmationId}`), {
                status: 'rejected',
                rejectedAt: Date.now()
              });
              Alert.alert('Успех', 'Запрос отклонен');
            } catch (error) {
              console.error('Ошибка отклонения:', error);
              Alert.alert('Ошибка', 'Не удалось отклонить запрос');
            }
          }
        }
      ]
    );
  };

  const getTypeConfig = (type) => {
    if (type === 'arrival') {
      return { text: 'Прибытие', icon: 'location-outline', color: '#1F4E8C', bgColor: '#E8F0FA' };
    }
    return { text: 'Завершение', icon: 'checkmark-circle-outline', color: '#4CAF50', bgColor: '#E8F5E9' };
  };

  const renderConfirmationItem = ({ item }) => {
    const typeConfig = getTypeConfig(item.type);
    
    return (
      <View style={styles.confirmationCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
            <Ionicons name={typeConfig.icon} size={14} color={typeConfig.color} />
            <Text style={[styles.typeText, { color: typeConfig.color }]}>
              {typeConfig.text}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>

        <View style={styles.workerInfo}>
          <Ionicons name="person-outline" size={18} color="#1F4E8C" />
          <Text style={styles.workerName}>{item.workerName}</Text>
        </View>

        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{item.taskTitle}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color="#8FA3BF" />
            <Text style={styles.taskAddress}>{item.location}</Text>
          </View>
        </View>

        <View style={styles.photoContainer}>
          <Image source={{ uri: item.photo }} style={styles.photo} />
        </View>

        <View style={styles.attemptInfo}>
          <Ionicons name="camera-outline" size={12} color="#FF9800" />
          <Text style={styles.attemptText}>
            Попытка #{item.attempts}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Подтвердить</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Отклонить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1F4E8C" />
      </View>
    );
  }

  if (confirmations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#E2E8F0" />
        <Text style={styles.emptyText}>Нет ожидающих подтверждений</Text>
        <Text style={styles.emptySubtext}>
          Запросы на фото-подтверждение появятся здесь
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Счётчик ожидающих подтверждений */}
      <View style={styles.headerSection}>
        <Text style={styles.taskCountText}>
          Всего на проверке: {confirmations.length}
        </Text>
      </View>

      <FlatList
        data={confirmations}
        renderItem={renderConfirmationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
  },
  taskCountText: {
    fontSize: 14,
    color: '#8FA3BF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#8FA3BF',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8FA3BF',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    color: '#8FA3BF',
    fontSize: 11,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  taskInfo: {
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskAddress: {
    flex: 1,
    fontSize: 13,
    color: '#8FA3BF',
  },
  photoContainer: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: '#F4F7FB',
  },
  attemptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF8E7',
    borderRadius: 8,
    gap: 6,
  },
  attemptText: {
    color: '#FF9800',
    fontSize: 11,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default PhotoConfirmationsTab;