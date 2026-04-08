// admin/AddTaskTab.js - добавьте импорт и состояние для пикера
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { ref, set } from 'firebase/database';
import { db } from '../config';
import { geocodeAddress } from '../utils/geocoding';
import WorkerSelector from '../common/WorkerSelector';
import { formatAddress } from '../utils/helpers';
import { showAlert } from '../utils/notifications';
import { TimePickerModal } from '../utils/dateTimePicker';

const AddTaskTab = ({ selectedWorker, workers, setSelectedWorker, workersLoading = false }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
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

  const handleAddTask = async () => {
    if (!taskTitle || !taskLocation || !taskTime || !selectedWorker) {
      showAlert('Ошибка', 'Заполните все поля');
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
      showAlert('Успех', 'Задача создана!');
    } catch (error) {
      showAlert('Ошибка', error.message);
    } finally {
      setIsFetchingAddresses(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <WorkerSelector 
          selectedWorker={selectedWorker}
          workers={workers}
          setSelectedWorker={setSelectedWorker}
          workersLoading={workersLoading}
        />

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Название задачи</Text>
          <TextInput
            placeholder="Введите название"
            value={taskTitle}
            onChangeText={setTaskTitle}
            style={styles.input}
            placeholderTextColor="#8FA3BF"
            maxLength={500}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Адрес клиента</Text>
          <View style={styles.addressContainer}>
            <TextInput
              placeholder="Введите адрес"
              value={taskLocation}
              onChangeText={text => {
                setTaskLocation(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(taskLocation.length > 0)}
              style={styles.input}
              placeholderTextColor="#8FA3BF"
            />

            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                {isFetchingAddresses ? (
                  <ActivityIndicator size="small" color="#1F4E8C" style={styles.suggestionsLoader} />
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
                        <Text style={styles.suggestionText}> {formatAddress(item)}</Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.place_id.toString()}
                    nestedScrollEnabled={true}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Время выполнения</Text>
          <TouchableOpacity 
            onPress={() => setTimePickerVisible(true)}
            style={styles.timeInput}
          >
            <Text style={taskTime ? styles.timeText : styles.timePlaceholder}>
              {taskTime || 'Выберите время'}
            </Text>
          </TouchableOpacity>
        </View>

        <TimePickerModal
          visible={timePickerVisible}
          onClose={() => setTimePickerVisible(false)}
          onConfirm={(time) => setTaskTime(time)}
          currentTime={taskTime}
        />

        <TouchableOpacity
          style={[styles.addButton, isFetchingAddresses && styles.addButtonDisabled]}
          onPress={handleAddTask}
          disabled={isFetchingAddresses}
        >
          {isFetchingAddresses ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.addButtonText}>Добавить задачу</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
  },
  addressContainer: {
    zIndex: 1000,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  suggestionsLoader: {
    padding: 20,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  timeInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  timeText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  timePlaceholder: {
    fontSize: 15,
    color: '#8FA3BF',
  },
  addButton: {
    backgroundColor: '#1F4E8C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#8FA3BF',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default AddTaskTab;