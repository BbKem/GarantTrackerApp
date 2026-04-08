// worker/WorkerCompletedTasksTab.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Modal,
  FlatList,
  Platform,
  Image
} from 'react-native';
import { ref, update } from 'firebase/database';
import { db } from '../config';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

// Веб-совместимый Alert
const showAlert = (title, message, buttons = null) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      const confirmButton = buttons.find(b => b.text === 'Скрыть' || b.text === 'Удалить');
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

const WorkerCompletedTasksTab = ({ tasks, user, onCleanupTasks }) => {
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  
  const completedTasks = tasks.filter(t => 
    t.assignedTo === user.username && 
    t.completed && 
    !t.hiddenForWorker
  );

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => {
      const isSelected = prev.includes(taskId);
      if (isSelected) return prev.filter(id => id !== taskId);
      return [...prev, taskId];
    });
  };

  const selectAllTasks = () => {
    setSelectedTasks(completedTasks.map(task => task.id));
  };

  const clearSelection = () => {
    setSelectedTasks([]);
  };

  const cleanupTasks = async () => {
    if (selectedTasks.length === 0) {
      showAlert('Ошибка', 'Выберите задачи для очистки');
      return;
    }

    const confirmCleanup = () => {
      showAlert(
        'Подтверждение',
        `Скрыть ${selectedTasks.length} завершённых ${selectedTasks.length === 1 ? 'задачу' : 'задач'} из списка?`,
        [
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => {}
          },
          {
            text: 'Скрыть',
            style: 'destructive',
            onPress: async () => {
              try {
                const updates = {};
                for (const taskId of selectedTasks) {
                  updates[`tasks/${user.username}/${taskId}/hiddenForWorker`] = true;
                }
                await update(ref(db), updates);

                showAlert('Успех', `Скрыто ${selectedTasks.length} ${selectedTasks.length === 1 ? 'задача' : 'задач'}`);
                setCleanupModalVisible(false);
                setSelectedTasks([]);
              } catch (error) {
                console.error('Ошибка очистки:', error);
                showAlert('Ошибка', 'Не удалось скрыть задачи');
              }
            }
          }
        ]
      );
    };
    
    confirmCleanup();
  };

  const renderTaskItem = ({ item }) => {
    const isSelected = selectedTasks.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.selectableTask, isSelected && styles.selectedTask]}
        onPress={() => toggleTaskSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.taskLocation}>{item.location}</Text>
          <Text style={styles.taskTime}>
            Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString('ru-RU') : 'нет данных'}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected &&   <Image source={require('../assets/free-icon-checkmarks-11229517.png')} style={{ width: 18, height: 18,  tintColor: '#fff'}} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNormalTaskItem = ({ item }) => (
    <TaskCard task={item} completed={true}>
      <View style={styles.completionInfo}>
        <Text style={styles.completionTime}>
          Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString('ru-RU') : 'нет данных'}
        </Text>
      </View>
      {item.lastChecked && (
        <View style={styles.arrivalInfo}>
          <Text style={styles.arrivalTime}>
            Прибытие: {new Date(item.lastChecked).toLocaleString('ru-RU')}
          </Text>
        </View>
      )}
    </TaskCard>
  );

  return (
    <View style={styles.tabContainer}>
      <View style={styles.headerSection}>
        <Text style={styles.taskCountText}>
          Всего завершённых задач: {completedTasks.length}
        </Text>
        {completedTasks.length > 0 && (
          <TouchableOpacity 
            style={styles.cleanupButton}
            onPress={() => setCleanupModalVisible(true)}
          >
            <Text style={styles.cleanupButtonText}>Очистить</Text>
          </TouchableOpacity>
        )}
      </View>

      <TaskList 
        tasks={completedTasks}
        renderTaskItem={renderNormalTaskItem}
        emptyMessage="Нет завершённых задач"
      />

      {/* Модальное окно выбора задач для удаления */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cleanupModalVisible}
        onRequestClose={() => setCleanupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Скрыть завершённые задачи</Text>
              <TouchableOpacity onPress={() => setCleanupModalVisible(false)}>
                 <Image source={require('../assets/free-icon-close-4013407.png')} style={{ width: 24, height: 24, tintColor: '#8FA3BF' }} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={selectAllTasks}
              >
                <Text style={styles.actionButtonText}>Выбрать все</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={clearSelection}
              >
                <Text style={styles.actionButtonText}>Сбросить</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedInfo}>
              Выбрано: {selectedTasks.length}
            </Text>

            <FlatList
              data={completedTasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item.id}
              style={styles.tasksList}
              showsVerticalScrollIndicator={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCleanupModalVisible(false);
                  setSelectedTasks([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.cleanupModalButton,
                  selectedTasks.length === 0 && styles.cleanupButtonDisabled
                ]}
                onPress={cleanupTasks}
                disabled={selectedTasks.length === 0}
              >
                <Text style={styles.cleanupModalButtonText}>
                  Скрыть ({selectedTasks.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: { 
    flex: 1 
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
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FEF5F5',
    gap: 6,
  },
  cleanupButtonText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  completionTime: { 
    fontSize: 12,
    color: '#4CAF50', 
    fontWeight: '500',
  },
  arrivalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  arrivalTime: { 
    fontSize: 11,
    color: '#1F4E8C', 
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 20, 
    width: '100%', 
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#1A1A1A',
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: { 
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F4F7FB',
    borderRadius: 16,
  },
  actionButtonText: { 
    color: '#1F4E8C', 
    fontSize: 13,
    fontWeight: '500',
  },
  selectedInfo: { 
    textAlign: 'right',
    marginBottom: 12,
    color: '#8FA3BF',
    fontSize: 13,
  },
  tasksList: { 
    maxHeight: 400,
    marginBottom: 16,
  },
  selectableTask: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  selectedTask: { 
    backgroundColor: '#FEF5F5',
  },
  taskContent: { 
    flex: 1,
    marginRight: 12,
  },
  taskTitle: { 
    fontSize: 15, 
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  taskLocation: { 
    fontSize: 13, 
    color: '#8FA3BF', 
    marginBottom: 2,
  },
  taskTime: { 
    fontSize: 11, 
    color: '#8FA3BF',
  },
  checkbox: { 
    width: 22, 
    height: 22, 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: { 
    backgroundColor: '#FF6B6B', 
    borderColor: '#FF6B6B',
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 12,
  },
  modalButton: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: 'center',
  },
  cancelButton: { 
    backgroundColor: '#F4F7FB',
  },
  cancelButtonText: { 
    color: '#8FA3BF',
    fontWeight: '500',
  },
  cleanupModalButton: { 
    backgroundColor: '#FF6B6B',
  },
  cleanupButtonDisabled: { 
    backgroundColor: '#FFB6B6',
  },
  cleanupModalButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '600',
  },
});

export default WorkerCompletedTasksTab;