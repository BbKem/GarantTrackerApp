import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  Modal,
  FlatList
} from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const CompletedTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker }) => {
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const completedTasks = tasks.filter(t => t.completed);

  // Функция для выбора/отмены выбора работника
  const toggleWorkerSelection = (worker) => {
    setSelectedWorkers(prev => {
      const isSelected = prev.includes(worker.username);
      if (isSelected) {
        return prev.filter(w => w !== worker.username);
      } else {
        return [...prev, worker.username];
      }
    });
  };

  // Выбрать всех работников
  const selectAllWorkers = () => {
    setSelectedWorkers(workers.map(w => w.username));
  };

  // Очистить выбор
  const clearSelection = () => {
    setSelectedWorkers([]);
  };

  // Получить задачи для выбранных работников
  const getTasksForSelectedWorkers = () => {
    if (selectedWorkers.length === 0) return [];
    
    return completedTasks.filter(task => 
      selectedWorkers.includes(task.assignedTo)
    );
  };

  const exportToCSV = async () => {
    const tasksToExport = getTasksForSelectedWorkers();
    
    if (tasksToExport.length === 0) {
      Alert.alert('Ошибка', 'Нет завершенных задач для выбранных работников');
      return;
    }

    try {
      const headers = [
        'ID задачи',
        'Название',
        'Адрес',
        'Изначальное время',
        'Работник',
        'Дата прибытия работника',
        'Дата завершения'
      ];

      const csvRows = tasksToExport.map(task => [
        task.id || '',
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.location || '').replace(/"/g, '""')}"`,
        task.time || '',
        task.assignedTo || '',
        task.lastChecked ? new Date(task.lastChecked).toLocaleString('ru-RU') : '',
        task.completedAt ? new Date(task.completedAt).toLocaleString('ru-RU') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      const selectedWorkersText = selectedWorkers.length === workers.length 
        ? 'all_workers' 
        : selectedWorkers.join('_');
      
      const fileName = `completed_tasks_${selectedWorkersText}_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (Platform.OS === 'web') {
        // Для веб-версии
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Успех', 'Файл успешно скачан!');
      } else {
        // НОВЫЙ API для мобильных устройств
        const directory = FileSystem.documentDirectory;
        const fileUri = directory + fileName;
        
        // Создаем файл с использованием нового API
        const file = new FileSystem.File(fileUri);
        await file.writeAsStringAsync('\uFEFF' + csvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });

        // Предлагаем поделиться файлом
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Сохранить CSV файл',
            UTI: 'public.comma-separated-values-text'
          });
        } else {
          Alert.alert(
            'Успех', 
            `Файл сохранен!\n\nПуть: ${fileUri}\n\nЗадач выгружено: ${tasksToExport.length}`,
            [
              { 
                text: 'OK', 
                style: 'default',
                onPress: () => setExportModalVisible(false)
              }
            ]
          );
        }
      }

      setExportModalVisible(false);
      setSelectedWorkers([]);

    } catch (error) {
      console.error('Ошибка выгрузки:', error);
      Alert.alert('Ошибка', 'Не удалось выполнить выгрузку: ' + error.message);
    }
  };

  // Альтернативный вариант с использованием legacy API (если новый не работает)
  const exportToCSVLegacy = async () => {
    const tasksToExport = getTasksForSelectedWorkers();
    
    if (tasksToExport.length === 0) {
      Alert.alert('Ошибка', 'Нет завершенных задач для выбранных работников');
      return;
    }

    try {
      const headers = [
        'ID задачи',
        'Название',
        'Адрес',
        'Изначальное время',
        'Работник',
        'Дата прибытия работника',
        'Дата завершения'
      ];

      const csvRows = tasksToExport.map(task => [
        task.id || '',
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.location || '').replace(/"/g, '""')}"`,
        task.time || '',
        task.assignedTo || '',
        task.lastChecked ? new Date(task.lastChecked).toLocaleString('ru-RU') : '',
        task.completedAt ? new Date(task.completedAt).toLocaleString('ru-RU') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      const selectedWorkersText = selectedWorkers.length === workers.length 
        ? 'all_workers' 
        : selectedWorkers.join('_');
      
      const fileName = `completed_tasks_${selectedWorkersText}_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (Platform.OS === 'web') {
        // Для веб-версии
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Успех', 'Файл успешно скачан!');
      } else {
        // Используем legacy API
        const { writeAsStringAsync } = await import('expo-file-system/legacy');
        const fileUri = FileSystem.documentDirectory + fileName;
        
        await writeAsStringAsync(fileUri, '\uFEFF' + csvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });

        // Предлагаем поделиться файлом
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Сохранить CSV файл'
          });
        } else {
          Alert.alert(
            'Успех', 
            `Файл сохранен!\n\nИмя файла: ${fileName}\n\nЗадач выгружено: ${tasksToExport.length}`,
            [
              { 
                text: 'OK', 
                style: 'default',
                onPress: () => setExportModalVisible(false)
              }
            ]
          );
        }
      }

      setExportModalVisible(false);
      setSelectedWorkers([]);

    } catch (error) {
      console.error('Ошибка выгрузки:', error);
      Alert.alert('Ошибка', 'Не удалось выполнить выгрузку: ' + error.message);
    }
  };

  const openExportModal = () => {
    if (completedTasks.length === 0) {
      Alert.alert('Ошибка', 'Нет завершенных задач для выгрузки');
      return;
    }
    setExportModalVisible(true);
  };

  const closeExportModal = () => {
    setExportModalVisible(false);
    setSelectedWorkers([]);
  };

  const renderWorkerItem = ({ item }) => {
    const isSelected = selectedWorkers.includes(item.username);
    const workerCompletedTasks = completedTasks.filter(t => t.assignedTo === item.username);
    
    return (
      <TouchableOpacity
        style={[
          styles.workerItem,
          isSelected && styles.workerItemSelected
        ]}
        onPress={() => toggleWorkerSelection(item)}
      >
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{item.username}</Text>
          <Text style={styles.taskCount}>
            Завершенных задач: {workerCompletedTasks.length}
          </Text>
        </View>
        <View style={[
          styles.checkbox,
          isSelected && styles.checkboxSelected
        ]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskItem = ({ item }) => {
    return (
      <TaskCard task={item} completed={true}>
        <Text style={styles.completionTime}>
          Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'нет данных'}
        </Text>
        {item.lastChecked && (
          <Text style={styles.arrivalTime}>
            Прибытие: {new Date(item.lastChecked).toLocaleString()}
          </Text>
        )}
      </TaskCard>
    );
  };

  const selectedTasksCount = getTasksForSelectedWorkers().length;

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Завершенные задачи ({completedTasks.length})</Text>
      
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      {completedTasks.length > 0 && (
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={openExportModal}
        >
          <Text style={styles.exportButtonText}>Выгрузить CSV</Text>
        </TouchableOpacity>
      )}

      <TaskList 
        tasks={completedTasks.filter(t => t.assignedTo === selectedWorker)}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет завершенных задач"
      />

      {/* Модальное окно выбора работников */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exportModalVisible}
        onRequestClose={closeExportModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выбор работников для выгрузки</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={selectAllWorkers}
              >
                <Text style={styles.actionButtonText}>Выбрать всех</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={clearSelection}
              >
                <Text style={styles.actionButtonText}>Очистить</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedInfo}>
              Выбрано: {selectedWorkers.length} работников, {selectedTasksCount} задач
            </Text>

            <FlatList
              data={workers}
              renderItem={renderWorkerItem}
              keyExtractor={item => item.username}
              style={styles.workersList}
              contentContainerStyle={styles.workersListContent}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeExportModal}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.exportModalButton,
                  selectedTasksCount === 0 && styles.exportButtonDisabled
                ]}
                onPress={exportToCSVLegacy} // Используем legacy версию
                disabled={selectedTasksCount === 0}
              >
                <Text style={styles.exportModalButtonText}>
                  Выгрузить ({selectedTasksCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Стили остаются такими же...
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
  completionTime: {
    marginTop: 5,
    color: '#2196F3',
    fontWeight: '500',
  },
  arrivalTime: {
    marginTop: 3,
    color: '#4CAF50',
    fontWeight: '500',
    fontSize: 12,
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  exportButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedInfo: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
    fontSize: 14,
  },
  workersList: {
    maxHeight: 300,
  },
  workersListContent: {
    paddingBottom: 10,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workerItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  exportModalButton: {
    backgroundColor: '#4CAF50',
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CompletedTasksTab;