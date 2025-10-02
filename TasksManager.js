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
  Modal,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ref, set, get, onValue, off, update } from 'firebase/database';
import { db } from './config';
import { geocodeAddress } from './utils/geocoding';
import * as Location from 'expo-location';
import haversineDistance from 'haversine-distance';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

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

// Компонент профиля
const ProfileModal = ({ visible, user, onClose, onSignOut }) => {
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
                source={{ uri: 'https://via.placeholder.com/100x100?text=Worker' }}
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{user.username}</Text>
            <Text style={styles.profileRole}>
              {user.userType === 'admin' ? 'Администратор' : 'Работник'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Логин</Text>
                <Text style={styles.infoValue}>{user.username}</Text>
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
                  {user.userType === 'admin' ? 'Администратор системы' : 'Работник'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.logoutButton} onPress={onSignOut}>
              <Ionicons name="log-out" size={20} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Выйти из системы</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Компонент выбора работника (переиспользуемый)
const WorkerSelector = ({ selectedWorker, workers, setSelectedWorker }) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Выберите работника:</Text>
      <Picker
        selectedValue={selectedWorker}
        onValueChange={setSelectedWorker}
        style={styles.picker}
        dropdownIconColor="#007AFF"
        mode="dropdown"
      >
        {workers.map(worker => (
          <Picker.Item 
            key={worker.username} 
            label={worker.username} 
            value={worker.username} 
          />
        ))}
      </Picker>
    </View>
  );
};

// Компонент для вкладки добавления задачи
const AddTaskTab = ({ 
  selectedWorker, 
  workers, 
  setSelectedWorker 
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);

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
        assignedBy: 'admin',
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

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Добавление новой задачи</Text>

      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <TextInput
        placeholder="Название задачи"
        value={taskTitle}
        onChangeText={setTaskTitle}
        style={styles.input}
        placeholderTextColor="#999"
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
          placeholderTextColor="#999"
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
                nestedScrollEnabled={true}
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
        color="#007AFF"
      />
    </View>
  );
};

// Компонент для отображения списка задач без ScrollView
const TaskList = ({ tasks, renderTaskItem, emptyMessage }) => {
  if (tasks.length === 0) {
    return (
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    );
  }

  return (
    <FlatList
      data={tasks}
      renderItem={renderTaskItem}
      keyExtractor={item => item.id}
      scrollEnabled={true}
      style={styles.taskList}
    />
  );
};

// Компонент для вкладки активных задач администратора
const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker }) => {
  const activeTasks = tasks.filter(t => t.assignedTo === selectedWorker && !t.completed);

  const renderTaskItem = ({ item }) => {
    return (
      <View style={styles.taskCard}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text>Адрес: {item.location}</Text>
        <Text>Время: {item.time}</Text>
        
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
      </View>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Активные задачи ({activeTasks.length})</Text>
      
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <TaskList 
        tasks={activeTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет активных задач"
      />
    </View>
  );
};

// Компонент для вкладки завершенных задач администратора
const CompletedTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker }) => {
  const completedTasks = tasks.filter(t => t.assignedTo === selectedWorker && t.completed);

  const renderTaskItem = ({ item }) => {
    return (
      <View style={[styles.taskCard, styles.completedTask]}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text>Адрес: {item.location}</Text>
        <Text>Время: {item.time}</Text>
        <Text style={styles.completionTime}>
          Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'нет данных'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Завершенные задачи ({completedTasks.length})</Text>
      
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <TaskList 
        tasks={completedTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет завершенных задач"
      />
    </View>
  );
};

// Компонент для активных задач работника
const WorkerActiveTasksTab = ({ tasks, user, loadingTasks, progressTasks, onConfirmLocation, onCompleteTask }) => {
  const activeTasks = tasks.filter(t => t.assignedTo === user.username && !t.completed);

  const renderTaskItem = ({ item }) => {
    const isLoading = loadingTasks[item.id] || false;
    const progress = progressTasks[item.id] || 0;

    return (
      <View style={styles.taskCard}>
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

        {!item.completed && (
          <View style={styles.buttonGroup}>
            <Button
              title={isLoading ? "Проверка..." : "Подтвердить местоположение"}
              onPress={() => onConfirmLocation(item)}
              color="#4CAF50"
              style={styles.button}
              disabled={isLoading}
            />
            <View style={styles.buttonSpacer} />
            <Button
              title="Завершить задачу"
              onPress={() => onCompleteTask(item)}
              color="#2196F3"
              disabled={!item.isOnSite || isLoading}
              style={styles.button}
            />
          </View>
        )}

        {item.completed && (
          <Text style={styles.completedText}>✔ Задача завершена</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Активные задачи ({activeTasks.length})</Text>
      <TaskList 
        tasks={activeTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет активных задач"
      />
    </View>
  );
};

// Компонент для завершенных задач работника
const WorkerCompletedTasksTab = ({ tasks, user }) => {
  const completedTasks = tasks.filter(t => t.assignedTo === user.username && t.completed);

  const renderTaskItem = ({ item }) => {
    return (
      <View style={[styles.taskCard, styles.completedTask]}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text>Адрес: {item.location}</Text>
        <Text>Время: {item.time}</Text>
        <Text style={styles.completionTime}>
          Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'нет данных'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Завершенные задачи ({completedTasks.length})</Text>
      <TaskList 
        tasks={completedTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет завершенных задач"
      />
    </View>
  );
};

// Основной компонент администратора с вкладками
const AdminPanel = ({ user, onSignOut }) => {
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('add');
  const [profileVisible, setProfileVisible] = useState(false);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'add':
        return (
          <AddTaskTab
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
          />
        );
      case 'active':
        return (
          <ActiveTasksTab
            tasks={tasks}
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
          />
        );
      case 'completed':
        return (
          <CompletedTasksTab
            tasks={tasks}
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Кнопка профиля в правом верхнем углу */}
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => setProfileVisible(true)}
      >
        <Ionicons name="person-circle" size={32} color="#007AFF" />
      </TouchableOpacity>

      <Text style={styles.header}>Панель администратора</Text>
      
      {/* Контент вкладки */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      {/* Нижняя панель навигации */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'add' && styles.activeNavButton]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.navText, activeTab === 'add' && styles.activeNavText]}>
            Добавить
          </Text>
        </TouchableOpacity>
        
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

      {/* Модальное окно профиля */}
      <ProfileModal
        visible={profileVisible}
        user={user}
        onClose={() => setProfileVisible(false)}
        onSignOut={onSignOut}
      />
    </View>
  );
};

// Основной компонент работника с вкладками
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
      {/* Кнопка профиля в правом верхнем углу */}
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => setProfileVisible(true)}
      >
        <Ionicons name="person-circle" size={32} color="#007AFF" />
      </TouchableOpacity>

      <Text style={styles.header}>Мои задачи</Text>
      
      {/* Контент вкладки */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      {/* Нижняя панель навигации */}
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

      {/* Модальное окно профиля */}
      <ProfileModal
        visible={profileVisible}
        user={user}
        onClose={() => setProfileVisible(false)}
        onSignOut={onSignOut}
      />
    </View>
  );
};

// Основной компонент TasksManager
const TasksManager = ({ user, onSignOut }) => {
  const [tasks, setTasks] = useState([]);

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

  if (user.userType === 'admin') {
    return (
      <AdminPanel 
        user={user} 
        onSignOut={onSignOut}
        tasks={tasks}
      />
    );
  } else {
    return (
      <WorkerPanel 
        user={user} 
        onSignOut={onSignOut}
        tasks={tasks}
      />
    );
  }
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
  // Стили для кнопки профиля
  profileButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  // Стили для модального окна профиля
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
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileRole: {
    fontSize: 16,
    color: '#666',
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
  // Стили для вкладок
  tabContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    marginBottom: 70,
  },
  tabHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  // Стили для списков задач
  taskList: {
    flex: 1,
  },
  // Стили для выбора работника
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 40,
    justifyContent: 'center',
  },
  // Нижняя навигация
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
  // Общие стили
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    fontSize: 16,
  },
  taskCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
  buttonSpacer: {
    height: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  addressContainer: {
    marginBottom: 15,
    zIndex: 1000,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: 'white',
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
  },
  timeInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  timeText: {
    color: 'black',
    fontSize: 16,
  },
  timePlaceholder: {
    color: '#999',
    fontSize: 16,
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});

export default TasksManager;