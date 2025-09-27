import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { db } from './config';
import { ref, set, update } from 'firebase/database';
import * as Location from 'expo-location';

const LocationTracker = ({ user, navigation }) => {
  const [location, setLocation] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);

  // Загрузка текущей задачи
  useEffect(() => {
    if (user.userType === 'worker') {
      const tasksRef = ref(db, `tasks/${user.username}`);
      get(tasksRef).then((snapshot) => {
        if (snapshot.exists()) {
          const tasks = snapshot.val();
          const activeTask = Object.keys(tasks).find(key => !tasks[key].completed);
          if (activeTask) {
            setCurrentTask({ id: activeTask, ...tasks[activeTask] });
          }
        }
      });
    }
  }, [user]);

  // Запрос разрешения на геолокацию
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Доступ к геолокации отклонен!');
        return;
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    try {
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      return location;
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось получить местоположение');
      return null;
    }
  };

  const handleWorkAction = async () => {
    const currentLocation = await getCurrentLocation();
    if (!currentLocation) return;

    const timestamp = new Date().toISOString();
    const locationData = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      accuracy: currentLocation.coords.accuracy,
      timestamp,
      userId: user.username,
      userType: user.userType,
      status: isWorking ? 'ended' : 'started',
      taskId: currentTask?.id || null
    };

    const dbRef = ref(db, `workSessions/${user.username}/${timestamp}`);

    try {
      await set(dbRef, locationData);
      
      if (isWorking && currentTask) {
        // Помечаем задачу как выполненную
        const taskRef = ref(db, `tasks/${user.username}/${currentTask.id}/completed`);
        await set(taskRef, true);
        setCurrentTask(null);
      }
      
      Alert.alert(
        'Успех',
        isWorking 
          ? 'Работа завершена! Местоположение сохранено'
          : 'Работа начата! Местоположение сохранено'
      );
      setIsWorking(!isWorking);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить данные');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {isWorking ? 'Текущая задача активна' : 'Готов к работе'}
      </Text>

      {currentTask && (
        <View style={styles.taskContainer}>
          <Text style={styles.taskTitle}>Текущая задача:</Text>
          <Text>{currentTask.title}</Text>
          <Text>Адрес: {currentTask.location}</Text>
          <Text>Время: {currentTask.time}</Text>
        </View>
      )}

      {location && (
        <View style={styles.locationContainer}>
          <Text>Широта: {location.coords.latitude.toFixed(6)}</Text>
          <Text>Долгота: {location.coords.longitude.toFixed(6)}</Text>
          <Text>Точность: ±{location.coords.accuracy.toFixed(0)} метров</Text>
        </View>
      )}

      <Button
        title={isWorking ? 'Завершить работу' : 'Начать работу'}
        onPress={handleWorkAction}
        color={isWorking ? '#FF3B30' : '#34C759'}
      />

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  locationContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  taskContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
  },
  taskTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  error: {
    color: 'red',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default LocationTracker;