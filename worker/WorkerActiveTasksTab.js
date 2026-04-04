// worker/WorkerActiveTasksTab.js - без прогресс-бара

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const Alert = require('react-native').Alert;
    Alert.alert(title, message);
  }
};

const WorkerActiveTasksTab = ({ 
  tasks, 
  user, 
  loadingTasks, 
  onConfirmLocation, 
  onCompleteTask,
  pendingConfirmations
}) => {
  const activeTasks = tasks.filter(t => t.assignedTo === user.username && !t.completed);

  const handleConfirmPress = (item) => {
    if (loadingTasks[item.id]) {
      showAlert('Информация', 'Идёт проверка местоположения...');
      return;
    }
    if (item.isOnSite) {
      showAlert('Информация', 'Вы уже подтвердили местоположение');
      return;
    }
    onConfirmLocation(item);
  };

  const handleCompletePress = (item) => {
    if (loadingTasks[item.id]) {
      showAlert('Информация', 'Подождите, идёт обработка...');
      return;
    }
    if (!item.isOnSite) {
      showAlert('Ошибка', 'Сначала подтвердите местоположение');
      return;
    }
    onCompleteTask(item);
  };

  const renderTaskItem = ({ item }) => {
    const isLoading = loadingTasks[item.id] || false;
    
    const hasPendingArrival = pendingConfirmations?.some(
      p => p.taskId === item.id && p.type === 'arrival' && p.status === 'pending'
    );
    const hasPendingCompletion = pendingConfirmations?.some(
      p => p.taskId === item.id && p.type === 'completion' && p.status === 'pending'
    );

    const isPending = hasPendingArrival || hasPendingCompletion;
    const isConfirmDisabled = isLoading || isPending || item.isOnSite;
    const isCompleteDisabled = !item.isOnSite || isLoading || isPending;

    return (
      <TaskCard task={item} isPending={isPending}>
        {isPending && (
          <View style={styles.pendingContainer}>
            <Ionicons name="time-outline" size={14} color="#FF9800" />
            <Text style={styles.pendingText}>
              {hasPendingArrival 
                ? 'Фото прибытия на проверке' 
                : 'Фото завершения на проверке'}
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Определяем местоположение...</Text>
          </View>
        )}

        {!item.completed && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.blueButton,
                isConfirmDisabled && styles.blueButtonDisabled
              ]}
              onPress={() => handleConfirmPress(item)}
              disabled={isConfirmDisabled}
            >
              <Ionicons 
                name="location-outline" 
                size={18} 
                color={isConfirmDisabled ? '#8FA3BF' : '#FFFFFF'} 
              />
              <Text style={styles.blueButtonText}>
                {isLoading ? "Проверка..." : "Подтвердить местоположение"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.whiteButton,
                isCompleteDisabled && styles.whiteButtonDisabled
              ]}
              onPress={() => handleCompletePress(item)}
              disabled={isCompleteDisabled}
            >
              <Ionicons 
                name="checkmark-circle-outline" 
                size={18} 
                color={isCompleteDisabled ? '#8FA3BF' : '#1F4E8C'} 
              />
              <Text style={styles.whiteButtonText}>
                Завершить задачу
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {item.completed && (
          <View style={styles.completedContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>Задача завершена</Text>
          </View>
        )}
      </TaskCard>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <View style={styles.headerSection}>
        <Text style={styles.taskCountText}>
          Всего активных задач: {activeTasks.length}
        </Text>
      </View>
      
      <TaskList 
        tasks={activeTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет активных задач"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingBottom: 20,
    backgroundColor: '#F4F7FB',
  },
  taskCountText: {
    fontSize: 14,
    color: '#8FA3BF',
  },
  buttonGroup: {
    marginTop: 12,
    gap: 10,
  },
  blueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F4E8C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  blueButtonDisabled: {
    backgroundColor: '#8FA3BF',
    opacity: 0.7,
  },
  blueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  whiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  whiteButtonDisabled: {
    backgroundColor: '#F4F7FB',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  whiteButtonText: {
    color: '#1F4E8C',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#1F4E8C',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
});

export default WorkerActiveTasksTab;