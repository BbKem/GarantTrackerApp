// worker/WorkerPanel.js - исправленная версия (без искусственного прогресса)

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { ref, update, onValue, off } from 'firebase/database';
import { db } from '../config';
import * as Location from 'expo-location';
import haversineDistance from 'haversine-distance';
import ProfileModal from '../common/ProfileModal';
import WorkerActiveTasksTab from './WorkerActiveTasksTab';
import WorkerCompletedTasksTab from './WorkerCompletedTasksTab';
import PhotoConfirmationModal from './PhotoConfirmationModal';

// Веб-совместимый Alert
const showAlert = (title, message, buttons = null) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      const confirmButton = buttons.find(b => b.text === 'Подтвердить' || b.text === 'Сделать фото' || b.text === 'Удалить');
      const cancelButton = buttons.find(b => b.text === 'Отмена');
      
      if (confirmButton) {
        const result = window.confirm(`${title}\n\n${message}`);
        if (result && confirmButton.onPress) {
          confirmButton.onPress();
        } else if (!result && cancelButton?.onPress) {
          cancelButton.onPress();
        }
        return;
      }
    }
    window.alert(`${title}\n\n${message}`);
  } else {
    const Alert = require('react-native').Alert;
    if (buttons) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message);
    }
  }
};

const WorkerPanel = ({ user, onSignOut, tasks }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [profileVisible, setProfileVisible] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState({});
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [confirmationType, setConfirmationType] = useState(null);
  const [attempts, setAttempts] = useState({});
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  
  // Отслеживаем ожидающие подтверждения
  useEffect(() => {
    const confirmationsRef = ref(db, 'photoConfirmations');
    
    const unsubscribe = onValue(confirmationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pending = Object.entries(data)
          .map(([id, conf]) => ({
            id,
            ...conf
          }))
          .filter(conf => 
            conf.workerId === user.username && 
            conf.status === 'pending'
          );
        setPendingConfirmations(pending);
      } else {
        setPendingConfirmations([]);
      }
    });

    return () => off(confirmationsRef);
  }, [user]);

  const showLocationErrorAlert = (task, errorType, accuracy = null, isCompletion = false) => {
    const attemptKey = isCompletion ? `complete_${task.id}` : task.id;
    const currentAttempts = attempts[attemptKey] || 0;
    const newAttempts = currentAttempts + 1;
    
    setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

    if (newAttempts >= 3) {
      const message = isCompletion
        ? 'Не удалось подтвердить местоположение для завершения задачи после 3 попыток.\n\nВы можете подтвердить завершение с помощью фото.'
        : 'Не удалось определить местоположение после 3 попыток.\n\nВы можете подтвердить местоположение с помощью фото.';

      showAlert(
        'Проблемы с геолокацией',
        message,
        [
          { text: 'Отмена', style: 'cancel', onPress: () => {} },
          {
            text: 'Сделать фото',
            onPress: () => {
              if (task && task.id) {
                setCurrentTask(task);
                setConfirmationType(isCompletion ? 'completion' : 'arrival');
                setPhotoModalVisible(true);
              }
            }
          }
        ]
      );
    } else {
      let message = '';
      if (errorType === 'timeout') {
        message = `Не удалось определить местоположение (попытка ${newAttempts}/3)\n\nРекомендации:\n• Проверьте включен ли GPS\n• Выйдите на открытое пространство\n• Подождите 1-2 минуты`;
      } else if (errorType === 'accuracy') {
        message = `Низкая точность: ±${Math.round(accuracy)} метров (попытка ${newAttempts}/3)\n\nРекомендации:\n• Выйдите на открытое пространство\n• Подождите стабилизации GPS`;
      } else if (errorType === 'distance') {
        message = `Слишком далеко от объекта (попытка ${newAttempts}/3)\n\nПодойдите ближе к месту выполнения`;
      } else {
        message = `Ошибка геолокации (попытка ${newAttempts}/3)\n\nПопробуйте снова или выйдите на улицу`;
      }

      showAlert('Ошибка геолокации', message);
    }
  };

  const handleConfirmLocation = async (task) => {
    const hasPending = pendingConfirmations.some(
      p => p.taskId === task.id && p.type === 'arrival' && p.status === 'pending'
    );
    
    if (hasPending) {
      showAlert('Информация', 'Задача уже ожидает подтверждения администратора');
      return;
    }

    // На вебе используем геолокацию браузера
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        showAlert('Ошибка', 'Ваш браузер не поддерживает геолокацию');
        return;
      }

      setLoadingTasks(prev => ({ ...prev, [task.id]: true }));

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          if (accuracy > 300) {
            showLocationErrorAlert(task, 'accuracy', accuracy, false);
            setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
            return;
          }
          
          const distance = haversineDistance(
            { latitude, longitude },
            task.coordinates
          );
          
          if (distance > 300) {
            showLocationErrorAlert(task, 'distance', null, false);
            setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
            return;
          }
          
          setAttempts(prev => {
            const newAttempts = { ...prev };
            delete newAttempts[task.id];
            return newAttempts;
          });
          
          await update(ref(db, `tasks/${user.username}/${task.id}`), {
            isOnSite: true,
            lastChecked: new Date().toISOString(),
            lastLocation: {
              latitude,
              longitude,
              accuracy,
              timestamp: new Date().toISOString()
            }
          });
          
          showAlert('Подтверждено', 'Вы на месте! Теперь можно завершить задачу');
          setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorType = 'unknown';
          if (error.code === error.TIMEOUT) errorType = 'timeout';
          showLocationErrorAlert(task, errorType, null, false);
          setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      return;
    }

    // Мобильная версия
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Ошибка', 'Требуется доступ к геолокации');
        return;
      }

      setLoadingTasks(prev => ({ ...prev, [task.id]: true }));

      let currentLocation;
      try {
        currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут получения геопозиции')), 15000)
          )
        ]);
      } catch (locationError) {
        showLocationErrorAlert(task, 'timeout', null, false);
        setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        return;
      }

      const { coords } = currentLocation;
      
      if (coords.accuracy > 300) {
        showLocationErrorAlert(task, 'accuracy', coords.accuracy, false);
        setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        return;
      }

      const distance = haversineDistance(
        { latitude: coords.latitude, longitude: coords.longitude },
        task.coordinates
      );

      if (distance > 300) {
        showLocationErrorAlert(task, 'distance', null, false);
        setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        return;
      }

      setAttempts(prev => {
        const newAttempts = { ...prev };
        delete newAttempts[task.id];
        return newAttempts;
      });

      await update(ref(db, `tasks/${user.username}/${task.id}`), {
        isOnSite: true,
        lastChecked: new Date().toISOString(),
        lastLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp: new Date().toISOString()
        }
      });

      showAlert('Подтверждено', 'Вы на месте! Теперь можно завершить задачу');

    } catch (error) {
      console.error('Ошибка подтверждения местоположения:', error);
      showLocationErrorAlert(task, 'unknown', null, false);
    } finally {
      setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const handleCompleteTask = async (task) => {
    if (!task.isOnSite) {
      showAlert('Ошибка', 'Сначала подтвердите местоположение');
      return;
    }

    const hasPending = pendingConfirmations.some(
      p => p.taskId === task.id && p.type === 'completion' && p.status === 'pending'
    );
    
    if (hasPending) {
      showAlert('Информация', 'Завершение задачи уже ожидает подтверждения администратора');
      return;
    }

    // На вебе используем геолокацию браузера
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        showAlert('Ошибка', 'Ваш браузер не поддерживает геолокацию');
        return;
      }

      setLoadingTasks(prev => ({ ...prev, [task.id]: true }));

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          if (accuracy > 300) {
            const attemptKey = `complete_${task.id}`;
            const currentAttempts = attempts[attemptKey] || 0;
            const newAttempts = currentAttempts + 1;
            setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

            if (newAttempts >= 3) {
              showAlert(
                'Низкая точность GPS',
                `Точность ±${Math.round(accuracy)} метров. После 3 попыток вы можете подтвердить завершение фото.`,
                [
                  { text: 'Отмена', style: 'cancel', onPress: () => {} },
                  {
                    text: 'Сделать фото',
                    onPress: () => {
                      setCurrentTask(task);
                      setConfirmationType('completion');
                      setPhotoModalVisible(true);
                    }
                  }
                ]
              );
            } else {
              showAlert('Низкая точность', `Точность определения: ±${Math.round(accuracy)} метров (попытка ${newAttempts}/3)\n\nПодождите, пока GPS стабилизируется.`);
            }
            setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
            return;
          }

          const distance = haversineDistance(
            { latitude, longitude },
            task.coordinates
          );

          if (distance > 300) {
            const attemptKey = `complete_${task.id}`;
            const currentAttempts = attempts[attemptKey] || 0;
            const newAttempts = currentAttempts + 1;
            setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

            if (newAttempts >= 3) {
              showAlert(
                'Слишком далеко от объекта',
                `Вы находитесь в ${Math.round(distance)} метрах от цели. После 3 попыток вы можете подтвердить завершение фото.`,
                [
                  { text: 'Отмена', style: 'cancel', onPress: () => {} },
                  {
                    text: 'Сделать фото',
                    onPress: () => {
                      setCurrentTask(task);
                      setConfirmationType('completion');
                      setPhotoModalVisible(true);
                    }
                  }
                ]
              );
            } else {
              showAlert('Слишком далеко', `Вы находитесь в ${Math.round(distance)} метрах от объекта (попытка ${newAttempts}/3)\n\nПодойдите ближе к месту выполнения.`);
            }
            setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
            return;
          }

          setAttempts(prev => {
            const newAttempts = { ...prev };
            delete newAttempts[`complete_${task.id}`];
            return newAttempts;
          });

          await update(ref(db, `tasks/${user.username}/${task.id}`), {
            completed: true,
            completedAt: new Date().toISOString(),
            completedLocation: {
              latitude,
              longitude,
              accuracy
            }
          });

          showAlert('Успех', 'Задача успешно завершена!');
          setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        },
        (error) => {
          console.error('Geolocation error:', error);
          const attemptKey = `complete_${task.id}`;
          const currentAttempts = attempts[attemptKey] || 0;
          const newAttempts = currentAttempts + 1;
          setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

          if (newAttempts >= 3) {
            showAlert(
              'Проблемы с геолокацией',
              'Не удалось подтвердить местоположение для завершения задачи после 3 попыток.\n\nВы можете подтвердить завершение с помощью фото.',
              [
                { text: 'Отмена', style: 'cancel', onPress: () => {} },
                {
                  text: 'Сделать фото',
                  onPress: () => {
                    setCurrentTask(task);
                    setConfirmationType('completion');
                    setPhotoModalVisible(true);
                  }
                }
              ]
            );
          } else {
            showAlert('Ошибка геолокации', `Не удалось определить местоположение (попытка ${newAttempts}/3)\n\nПопробуйте снова`);
          }
          setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      return;
    }

    // Мобильная версия
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
        const attemptKey = `complete_${task.id}`;
        const currentAttempts = attempts[attemptKey] || 0;
        const newAttempts = currentAttempts + 1;
        setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

        if (newAttempts >= 3) {
          showAlert(
            'Проблемы с геолокацией',
            'Не удалось подтвердить местоположение для завершения задачи после 3 попыток.\n\nВы можете подтвердить завершение с помощью фото.',
            [
              { text: 'Отмена', style: 'cancel', onPress: () => {} },
              {
                text: 'Сделать фото',
                onPress: () => {
                  setCurrentTask(task);
                  setConfirmationType('completion');
                  setPhotoModalVisible(true);
                }
              }
            ]
          );
        } else {
          let message = '';
          if (locationError.message === 'Таймаут получения геопозиции') {
            message = `Не удалось определить местоположение (попытка ${newAttempts}/3)\n\nРекомендации:\n• Проверьте включен ли GPS\n• Выйдите на открытое пространство`;
          } else {
            message = `Ошибка геолокации (попытка ${newAttempts}/3)\n\nПопробуйте снова`;
          }
          showAlert('Ошибка геолокации', message);
        }
        setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        return;
      }

      const { coords } = currentLocation;
      
      if (coords.accuracy > 300) {
        const attemptKey = `complete_${task.id}`;
        const currentAttempts = attempts[attemptKey] || 0;
        const newAttempts = currentAttempts + 1;
        setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

        if (newAttempts >= 3) {
          showAlert(
            'Низкая точность GPS',
            `Точность ±${Math.round(coords.accuracy)} метров. После 3 попыток вы можете подтвердить завершение фото.`,
            [
              { text: 'Отмена', style: 'cancel', onPress: () => {} },
              {
                text: 'Сделать фото',
                onPress: () => {
                  setCurrentTask(task);
                  setConfirmationType('completion');
                  setPhotoModalVisible(true);
                }
              }
            ]
          );
        } else {
          showAlert('Низкая точность', `Точность определения: ±${Math.round(coords.accuracy)} метров (попытка ${newAttempts}/3)\n\nПодождите, пока GPS стабилизируется.`);
        }
        setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        return;
      }

      const distance = haversineDistance(
        { latitude: coords.latitude, longitude: coords.longitude },
        task.coordinates
      );

      if (distance > 300) {
        const attemptKey = `complete_${task.id}`;
        const currentAttempts = attempts[attemptKey] || 0;
        const newAttempts = currentAttempts + 1;
        setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

        if (newAttempts >= 3) {
          showAlert(
            'Слишком далеко от объекта',
            `Вы находитесь в ${Math.round(distance)} метрах от цели. После 3 попыток вы можете подтвердить завершение фото.`,
            [
              { text: 'Отмена', style: 'cancel', onPress: () => {} },
              {
                text: 'Сделать фото',
                onPress: () => {
                  setCurrentTask(task);
                  setConfirmationType('completion');
                  setPhotoModalVisible(true);
                }
              }
            ]
          );
        } else {
          showAlert('Слишком далеко', `Вы находитесь в ${Math.round(distance)} метрах от объекта (попытка ${newAttempts}/3)\n\nПодойдите ближе к месту выполнения.`);
        }
        setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
        return;
      }

      setAttempts(prev => {
        const newAttempts = { ...prev };
        delete newAttempts[`complete_${task.id}`];
        return newAttempts;
      });

      await update(ref(db, `tasks/${user.username}/${task.id}`), {
        completed: true,
        completedAt: new Date().toISOString(),
        completedLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        }
      });

      showAlert('Успех', 'Задача успешно завершена!');

    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
      
      const attemptKey = `complete_${task.id}`;
      const currentAttempts = attempts[attemptKey] || 0;
      const newAttempts = currentAttempts + 1;
      setAttempts(prev => ({ ...prev, [attemptKey]: newAttempts }));

      if (newAttempts >= 3) {
        showAlert(
          'Системная ошибка',
          'Произошла ошибка после 3 попыток. Вы можете подтвердить завершение фото.',
          [
            { text: 'Отмена', style: 'cancel', onPress: () => {} },
            {
              text: 'Сделать фото',
              onPress: () => {
                setCurrentTask(task);
                setConfirmationType('completion');
                setPhotoModalVisible(true);
              }
            }
          ]
        );
      } else {
        showAlert('Ошибка', `Произошла непредвиденная ошибка (попытка ${newAttempts}/3). Попробуйте снова.`);
      }
    } finally {
      setLoadingTasks(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const handlePhotoConfirmationSuccess = () => {
    showAlert('Успех', 'Фото отправлено на проверку администратору');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'active':
        return (
          <WorkerActiveTasksTab
            tasks={tasks}
            user={user}
            loadingTasks={loadingTasks}
            onConfirmLocation={handleConfirmLocation}
            onCompleteTask={handleCompleteTask}
            pendingConfirmations={pendingConfirmations} 
          />
        );
      case 'completed':
        return (
          <WorkerCompletedTasksTab
            tasks={tasks}
            user={user}
            onCleanupTasks={() => {}}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setProfileVisible(true)}
        >
          {user?.photoURL ? (
            <Image 
              source={{ uri: user.photoURL }} 
              style={styles.profileImage}
            />
          ) : (
            <Image source={require('../assets/free-icon-profile-9344418.png')} style={{ width: 32, height: 32,  tintColor: '#1F4E8C'}} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabHeaderContainer}>
        <Text style={styles.tabTitle}>
          {activeTab === 'active' ? 'Активные задачи' : 'Завершённые задачи'}
        </Text>
      </View>
      
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'active' && styles.activeNavButton]}
          onPress={() => setActiveTab('active')}
        >
       <Image 
  source={require('../assets/activ_icon.png')} 
  style={{ width: 24, height: 24, tintColor: '#1F4E8C'}} 
/>
          <Text style={[styles.navText, activeTab === 'active' && styles.activeNavText]}>
            Активные
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'completed' && styles.activeNavButton]}
          onPress={() => setActiveTab('completed')}
        >
            <Image 
  source={require('../assets/zavercheno_icon.png')} 
  style={{ width: 24, height: 24, tintColor:'#1F4E8C'}} 
/>
          <Text style={[styles.navText, activeTab === 'completed' && styles.activeNavText]}>
            Завершённые
          </Text>
        </TouchableOpacity>
      </View>

      <ProfileModal
        visible={profileVisible}
        user={user}
        onClose={() => setProfileVisible(false)}
        onSignOut={onSignOut}
      />

      <PhotoConfirmationModal
        visible={photoModalVisible}
        onClose={() => {
          setPhotoModalVisible(false);
          setCurrentTask(null);
          setConfirmationType(null);
        }}
        task={currentTask}
        user={user}
        confirmationType={confirmationType}
        onSuccess={handlePhotoConfirmationSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  navIcon: {
  width: 24,
  height: 24,
  tintColor: '#1F4E8C', 
},
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    height: 150,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  profileButton: {
    position: 'absolute',
    right: 16,
    top: 50,
    bottom: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#1F4E8C',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeNavButton: {
    backgroundColor: '#F4F7FB',
  },
  navText: {
    fontSize: 12,
    color: '#1F4E8C',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#1F4E8C',
    fontWeight: '600',
  },
  tabHeaderContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F4E8C',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default WorkerPanel;