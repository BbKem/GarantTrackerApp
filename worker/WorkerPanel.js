import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { db } from '../config';
import * as Location from 'expo-location';
import haversineDistance from 'haversine-distance';
import ProfileModal from '../common/ProfileModal';
import WorkerActiveTasksTab from './WorkerActiveTasksTab';
import WorkerCompletedTasksTab from './WorkerCompletedTasksTab';

const WorkerPanel = ({ user, onSignOut, tasks }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [profileVisible, setProfileVisible] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState({});
  const [progressTasks, setProgressTasks] = useState({});

  const handleConfirmLocation = async (task) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Требуется доступ к геолокации');
        return;
      }

      setLoadingTasks(prev => ({ ...prev, [task.id]: true }));
      setProgressTasks(prev => ({ ...prev, [task.id]: 0 }));

      const progressInterval = setInterval(() => {
        setProgressTasks(prev => ({
          ...prev,
          [task.id]: Math.min((prev[task.id] || 0) + 5, 100)
        }));
      }, 500);

      let currentLocation;
      try {
        currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут получения геопозиции')), 15000)
          )
        ]);
        
        clearInterval(progressInterval);
        setProgressTasks(prev => ({ ...prev, [task.id]: 100 }));

      } catch (locationError) {
        clearInterval(progressInterval);
        
        if (locationError.message === 'Таймаут получения геопозиции') {
          Alert.alert(
            'Ошибка геопозиции', 
            'Не удалось определить местоположение. Пожалуйста:\n\n' +
            '1. Проверьте включен ли GPS\n' +
            '2. Выйдите на открытое пространство\n' +
            '3. Подождите 1-2 минуты\n' +
            '4. Попробуйте снова'
          );
        } else {
          Alert.alert(
            'Ошибка геопозиции', 
            'Не удалось получить доступ к геолокации. ' +
            'Проверьте настройки местоположения на устройстве.'
          );
        }
        return;
      }

      const { coords } = currentLocation;
      
      if (coords.accuracy > 100) {
        Alert.alert(
          'Низкая точность', 
          `Точность определения: ±${Math.round(coords.accuracy)} метров. ` +
          'Подойдите в более открытое место для лучшего сигнала.'
        );
        return;
      }

      const distance = haversineDistance(
        { latitude: coords.latitude, longitude: coords.longitude },
        task.coordinates
      );

      const isOnSite = distance <= 100;
      
      await update(ref(db, `tasks/${user.username}/${task.id}`), {
        isOnSite,
        lastChecked: new Date().toISOString(),
        lastLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp: new Date().toISOString()
        }
      });

      Alert.alert(
        isOnSite ? 'Подтверждено' : 'Слишком далеко',
        isOnSite 
          ? 'Вы на месте! Теперь можно завершить задачу'
          : `Подойдите ближе (осталось ${Math.round(distance - 100)} м)`
      );

    } catch (error) {
      console.error('Ошибка подтверждения местоположения:', error);
      Alert.alert(
        'Ошибка', 
        'Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.'
      );
    } finally {
      setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
      setTimeout(() => {
        setProgressTasks(prev => ({ ...prev, [task.id]: 0 }));
      }, 500);
    }
  };

  const handleCompleteTask = async (task) => {
    if (!task.isOnSite) {
      Alert.alert('Ошибка', 'Сначала подтвердите местоположение');
      return;
    }

    try {
      setLoadingTasks(prev => ({ ...prev, [task.id]: true }));

      let currentLocation;
      try {
        currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeout: 15000
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут получения геопозиции')), 15000)
          )
        ]);
      } catch (locationError) {
        Alert.alert(
          'Ошибка геопозиции', 
          'Не удалось подтвердить местоположение. ' +
          'Пожалуйста, проверьте доступ к GPS и попробуйте снова.'
        );
        return;
      }

      const { coords } = currentLocation;
      
      if (coords.accuracy > 50) {
        Alert.alert(
          'Низкая точность', 
          'Точность определения слишком низкая для завершения задачи. ' +
          'Подождите, пока GPS стабилизируется.'
        );
        return;
      }

      const distance = haversineDistance(
        { latitude: coords.latitude, longitude: coords.longitude },
        task.coordinates
      );

      if (distance > 100) {
        Alert.alert('Ошибка', 'Вы должны находиться на месте для завершения задачи');
        return;
      }

      await update(ref(db, `tasks/${user.username}/${task.id}`), {
        completed: true,
        completedAt: new Date().toISOString(),
        completedLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        }
      });

      Alert.alert('Успех', 'Задача успешно завершена!');

    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
      Alert.alert('Ошибка', 'Не удалось завершить задачу. Попробуйте снова.');
    } finally {
      setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'active':
        return (
          <WorkerActiveTasksTab
            tasks={tasks}
            user={user}
            loadingTasks={loadingTasks}
            progressTasks={progressTasks}
            onConfirmLocation={handleConfirmLocation}
            onCompleteTask={handleCompleteTask}
          />
        );
      case 'completed':
        return (
          <WorkerCompletedTasksTab
            tasks={tasks}
            user={user}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => setProfileVisible(true)}
      >
        <Ionicons name="person-circle" size={32} color="#007AFF" />
      </TouchableOpacity>

      <Text style={styles.header}>Мои задачи</Text>
      
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'active' && styles.activeNavButton]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.navText, activeTab === 'active' && styles.activeNavText]}>
            Активные
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'completed' && styles.activeNavButton]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.navText, activeTab === 'completed' && styles.activeNavText]}>
            Завершенные
          </Text>
        </TouchableOpacity>
      </View>

      <ProfileModal
        visible={profileVisible}
        user={user}
        onClose={() => setProfileVisible(false)}
        onSignOut={onSignOut}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
  profileButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  tabContent: {
    flex: 1,
    marginBottom: 70,
  },
  bottomNavigation: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeNavButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  navText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default WorkerPanel;