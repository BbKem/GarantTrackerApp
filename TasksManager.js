import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Button, 
  Alert, 
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ref, set, get, onValue, off, update } from 'firebase/database';
import { db } from './config';
import { geocodeAddress } from './utils/geocoding';
import * as Location from 'expo-location';
import haversineDistance from 'haversine-distance';
import DateTimePicker from '@react-native-community/datetimepicker';

const formatAddress = (addressData) => {
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

const TasksManager = ({ user, onSignOut }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);
  
  // Новые состояния для управления загрузкой по задачам
  const [loadingTasks, setLoadingTasks] = useState({});
  const [progressTasks, setProgressTasks] = useState({});

  useEffect(() => {
    if (user.userType !== 'admin') return;

    const workersRef = ref(db, 'users');
    get(workersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const workersData = Object.entries(snapshot.val())
          .filter(([_, data]) => data.userType === 'worker')
          .map(([username]) => ({ username }));
        setWorkers(workersData);
        if (workersData.length) setSelectedWorker(workersData[0].username);
      }
    });
  }, [user]);

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    const handleDataChange = (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.val();
      const allTasks = [];
      
      Object.entries(data).forEach(([workerId, workerTasks]) => {
        Object.entries(workerTasks).forEach(([taskId, task]) => {
          allTasks.push({
            id: taskId,
            assignedTo: workerId,
            ...task
          });
        });
      });
      
      setTasks(allTasks);
    };

    onValue(tasksRef, handleDataChange);
    return () => off(tasksRef);
  }, []);

  useEffect(() => {
    if (taskLocation.length > 2 && showSuggestions) {
      const delayDebounce = setTimeout(() => {
        fetchAddressSuggestions(taskLocation);
      }, 500);

      return () => clearTimeout(delayDebounce);
    }
  }, [taskLocation, showSuggestions]);

  const fetchAddressSuggestions = async (query) => {
    setIsFetchingAddresses(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ru&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GarantAppTracker (bboykam@list.ru)',
          },
        }
      );
      const data = await response.json();
      setAddressSuggestions(data || []);
    } catch (error) {
      console.error('Ошибка при поиске адресов:', error);
      setAddressSuggestions([]);
    } finally {
      setIsFetchingAddresses(false);
    }
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      setTaskTime(`${hours}:${minutes}`);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle || !taskLocation || !taskTime || !selectedWorker) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setIsFetchingAddresses(true);
    try {
      const coords = await geocodeAddress(taskLocation);
      
      await set(ref(db, `tasks/${selectedWorker}/${Date.now()}`), {
        title: taskTitle,
        location: taskLocation,
        coordinates: coords,
        time: taskTime,
        assignedBy: user.username,
        isOnSite: false,
        lastChecked: null,
        completed: false,
        completedAt: null
      });

      setTaskTitle('');
      setTaskLocation('');
      setTaskTime('');
      setShowSuggestions(false);
      Alert.alert('Успех', 'Задача создана!');
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setIsFetchingAddresses(false);
    }
  };

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

  const renderTaskItem = ({ item }) => {
    const isLoading = loadingTasks[item.id] || false;
    const progress = progressTasks[item.id] || 0;

    return (
      <View style={[
        styles.taskCard,
        item.completed && styles.completedTask
      ]}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text>Адрес: {item.location}</Text>
        <Text>Время: {item.time}</Text>
        
        {isLoading && (
          <View style={styles.progressContainer}>
            <Text>Определяем местоположение... {progress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${progress}%`}]}/>
            </View>
          </View>
        )}

        {user.userType === 'worker' && !item.completed && (
          <View style={styles.buttonGroup}>
            <Button
              title={isLoading ? "Проверка..." : "Подтвердить местоположение"}
              onPress={() => handleConfirmLocation(item)}
              color="#4CAF50"
              style={styles.button}
              disabled={isLoading}
            />
            <View style={styles.buttonSpacer} />
            <Button
              title="Завершить задачу"
              onPress={() => handleCompleteTask(item)}
              color="#2196F3"
              disabled={!item.isOnSite || isLoading}
              style={styles.button}
            />
          </View>
        )}

        {user.userType === 'worker' && item.completed && (
          <Text style={styles.completedText}>✔ Задача завершена</Text>
        )}

        {user.userType === 'admin' && (
          <View style={styles.statusContainer}>
            {!item.completed ? (
              <>
                <View style={[
                  styles.statusDot,
                  item.isOnSite ? styles.statusOnSite : styles.statusOffSite
                ]}/>
                <Text>
                  {item.isOnSite 
                    ? `На месте (${item.lastChecked ? new Date(item.lastChecked).toLocaleTimeString() : 'нет данных'})` 
                    : 'Не подтверждено'}
                </Text>
              </>
            ) : (
              <Text style={styles.completionTime}>
                Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'нет данных'}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>
        {user.userType === 'admin' ? 'Панель администратора' : 'Мои задачи'}
      </Text>

      {user.userType === 'admin' ? (
        <>
          <Picker
            selectedValue={selectedWorker}
            onValueChange={setSelectedWorker}
            style={styles.picker}
          >
            {workers.map(worker => (
              <Picker.Item 
                key={worker.username} 
                label={worker.username} 
                value={worker.username} 
              />
            ))}
          </Picker>

          <TextInput
            placeholder="Название задачи"
            value={taskTitle}
            onChangeText={setTaskTitle}
            style={styles.input}
          />

          <View style={styles.addressContainer}>
            <TextInput
              placeholder="Адрес клиента"
              value={taskLocation}
              onChangeText={text => {
                setTaskLocation(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(taskLocation.length > 0)}
              style={styles.input}
            />

            {showSuggestions && (
               <View style={styles.suggestionsContainer}>
                 {isFetchingAddresses ? (
                    <ActivityIndicator size="small" color="#0000ff" />
                 ) : (
                   <FlatList
                     data={addressSuggestions}
                     renderItem={({item}) => (
                      <TouchableOpacity 
                        style={styles.suggestionItem}
                        onPress={() => {
                          setTaskLocation(formatAddress(item));
                          setShowSuggestions(false);
                        }}
                       >
                        <Text style={styles.suggestionText}>
                          {formatAddress(item)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.place_id.toString()}
                  />
                )}
              </View>
            )}
          </View>

          <TouchableOpacity 
            onPress={() => setShowTimePicker(true)}
            style={styles.timeInput}
          >
            <Text style={taskTime ? styles.timeText : styles.timePlaceholder}>
              {taskTime || 'Выберите время (например, 14:30)'}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          <Button
            title={isFetchingAddresses ? 'Проверяем адрес...' : 'Добавить задачу'}
            onPress={handleAddTask}
            disabled={isFetchingAddresses}
          />

          <Text style={styles.sectionHeader}>Активные задачи:</Text>
          <FlatList
            data={tasks.filter(t => t.assignedTo === selectedWorker && !t.completed)}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />

          <Text style={styles.sectionHeader}>Завершенные задачи:</Text>
          <FlatList
            data={tasks.filter(t => t.assignedTo === selectedWorker && t.completed)}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </>
      ) : (
        <>
          <Text style={styles.sectionHeader}>Активные задачи:</Text>
          <FlatList
            data={tasks.filter(t => t.assignedTo === user.username && !t.completed)}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text>Нет активных задач</Text>}
            scrollEnabled={false}
          />

          <Text style={styles.sectionHeader}>Завершенные задачи:</Text>
          <FlatList
            data={tasks.filter(t => t.assignedTo === user.username && t.completed)}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text>Нет завершенных задач</Text>}
            scrollEnabled={false}
          />
        </>
      )}

      <Button 
        title="Выйти" 
        onPress={onSignOut} 
        color="red" 
        style={styles.logoutButton} 
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  picker: {
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
  },
  taskCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
  },
  completedTask: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  taskTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  buttonGroup: {
    marginTop: 10,
  },
  button: {
    marginBottom: 5,
  },
  buttonSpacer: {
    height: 8,
  },
  statusContainer: {
    marginTop: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnSite: {
    backgroundColor: '#4CAF50',
  },
  statusOffSite: {
    backgroundColor: '#F44336',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  completedText: {
    color: '#4CAF50',
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
  completionTime: {
    marginTop: 5,
    color: '#2196F3',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 20,
  },
  addressContainer: {
    marginBottom: 15,
    zIndex: 1000,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: 'white',
    marginTop: -10,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
  },
  timeInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  timeText: {
    color: 'black',
  },
  timePlaceholder: {
    color: '#888',
  },
  progressContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
});

export default TasksManager;