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
  TouchableOpacity
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, set } from 'firebase/database';
import { db } from '../config';
import { geocodeAddress } from '../utils/geocoding';
import WorkerSelector from '../common/WorkerSelector';
import { formatAddress } from '../utils/helpers';

const AddTaskTab = ({ selectedWorker, workers, setSelectedWorker }) => {
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

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  tabHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
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
});

export default AddTaskTab;