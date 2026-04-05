import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  Modal,
  FlatList,
  Switch
} from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { ref, set, remove, update } from 'firebase/database';
import { db } from '../config';
import { Ionicons } from '@expo/vector-icons';

const CompletedTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker, workersLoading = false }) => {
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [deleteAfterExport, setDeleteAfterExport] = useState(false);
  const completedTasks = tasks.filter(t => t.completed);

  const toggleWorkerSelection = (worker) => {
    setSelectedWorkers(prev => {
      const isSelected = prev.includes(worker.username);
      if (isSelected) return prev.filter(w => w !== worker.username);
      return [...prev, worker.username];
    });
  };

  const selectAllWorkers = () => setSelectedWorkers(workers.map(w => w.username));
  const clearSelection = () => setSelectedWorkers([]);

  const getTasksForSelectedWorkers = () => {
    if (selectedWorkers.length === 0) return [];
    return completedTasks.filter(task => selectedWorkers.includes(task.assignedTo));
  };

  const archiveTasks = async (tasksToArchive) => {
    try {
      const archiveTimestamp = Date.now();
      
      for (const task of tasksToArchive) {
        const archivedTask = {
          id: task.id,
          title: task.title,
          location: task.location,
          coordinates: task.coordinates,
          time: task.time,
          assignedTo: task.assignedTo,
          assignedBy: task.assignedBy,
          isOnSite: task.isOnSite || false,
          lastChecked: task.lastChecked || null,
          completed: task.completed || false,
          completedAt: task.completedAt || null,
          lastLocation: task.lastLocation || null,
          completedLocation: task.completedLocation || null,
          archivedAt: archiveTimestamp,
          archivedBy: 'admin',
          originalPath: `tasks/${task.assignedTo}/${task.id}`
        };

        const archiveRef = ref(db, `archive/tasks/${task.assignedTo}/${task.id}`);
        await set(archiveRef, archivedTask);

        const taskRef = ref(db, `tasks/${task.assignedTo}/${task.id}`);
        await remove(taskRef);
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка архивации:', error);
      return false;
    }
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
        `"${task.id}"`,
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.location || '').replace(/"/g, '""')}"`,
        `"${task.time || ''}"`,
        `"${task.assignedTo || ''}"`,
        `"${task.lastChecked ? new Date(task.lastChecked).toLocaleString('ru-RU') : ''}"`,
        `"${task.completedAt ? new Date(task.completedAt).toLocaleString('ru-RU') : ''}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...csvRows.map(row => row.join(';'))].join('\n');

      const selectedWorkersText = selectedWorkers.length === workers.length
        ? 'all_workers'
        : selectedWorkers.join('_');

      const fileName = `completed_tasks_${selectedWorkersText}_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Сохранить CSV файл',
            UTI: 'public.comma-separated-values-text',
          });
        }
      }

      if (deleteAfterExport) {
        const archiveSuccess = await archiveTasks(tasksToExport);
        if (archiveSuccess) {
          Alert.alert('Успех', `Файл выгружен и задачи перемещены в архив!`);
        } else {
          Alert.alert('Успех', `Файл выгружен, но возникла ошибка при архивации задач`);
        }
      } else {
        Alert.alert('Успех', 'Файл успешно выгружен!');
      }

      setExportModalVisible(false);
      setSelectedWorkers([]);
      setDeleteAfterExport(false);
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

  const renderWorkerItem = ({ item }) => {
    const isSelected = selectedWorkers.includes(item.username);
    const workerCompletedTasks = completedTasks.filter(t => t.assignedTo === item.username);

    return (
      <TouchableOpacity
        style={[styles.workerItem, isSelected && styles.workerItemSelected]}
        onPress={() => toggleWorkerSelection(item)}
      >
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{item.username}</Text>
          <Text style={styles.taskCount}>
            Завершенных задач: {workerCompletedTasks.length}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskItem = ({ item }) => (
    <TaskCard task={item} completed={true}>
      <View style={styles.completionInfo}>
        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
        <Text style={styles.completionTime}>
          Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'нет данных'}
        </Text>
      </View>
      {item.lastChecked && (
        <View style={styles.arrivalInfo}>
          <Ionicons name="location-outline" size={12} color="#1F4E8C" />
          <Text style={styles.arrivalTime}>
            Прибытие: {new Date(item.lastChecked).toLocaleString()}
          </Text>
        </View>
      )}
    </TaskCard>
  );

  const selectedTasksCount = getTasksForSelectedWorkers().length;

  return (
    <View style={styles.tabContainer}>
      {/* Выбор работника */}
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
        workersLoading={workersLoading}
      />

      {/* Строка со счётчиком и кнопкой выгрузки */}
      <View style={styles.headerSection}>
        <Text style={styles.taskCountText}>
          Всего завершённых задач: {completedTasks.filter(t => t.assignedTo === selectedWorker).length}
        </Text>
        {completedTasks.length > 0 && (
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={openExportModal}
          >
            <Ionicons name="download-outline" size={16} color="#1F4E8C" />
            <Text style={styles.exportButtonText}>Выгрузить CSV</Text>
          </TouchableOpacity>
        )}
      </View>

      <TaskList 
        tasks={completedTasks.filter(t => t.assignedTo === selectedWorker)}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет завершённых задач"
      />

      {/* Модальное окно выбора работников */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exportModalVisible}
        onRequestClose={() => {
          setExportModalVisible(false);
          setDeleteAfterExport(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setExportModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выгрузка задач</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8FA3BF" />
              </TouchableOpacity>
            </View>
            
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
                <Text style={styles.actionButtonText}>Сбросить</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedInfo}>
              Выбрано: {selectedWorkers.length} работников, {selectedTasksCount} задач
            </Text>

            <View style={styles.deleteOption}>
              <View style={styles.deleteOptionText}>
                <Text style={styles.deleteOptionTitle}>Удалить после выгрузки</Text>
                <Text style={styles.deleteOptionSubtitle}>
                  Задачи будут перемещены в архив
                </Text>
              </View>
              <Switch
                value={deleteAfterExport}
                onValueChange={setDeleteAfterExport}
                trackColor={{ false: '#E2E8F0', true: '#4CAF50' }}
                thumbColor={deleteAfterExport ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

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
                onPress={() => {
                  setExportModalVisible(false);
                  setSelectedWorkers([]);
                  setDeleteAfterExport(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.exportModalButton,
                  selectedTasksCount === 0 && styles.exportButtonDisabled
                ]}
                onPress={exportToCSV}
                disabled={selectedTasksCount === 0}
              >
                <Text style={styles.exportModalButtonText}>
                  Выгрузить ({selectedTasksCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 0,
    paddingBottom: 12,
    backgroundColor: '#F4F7FB',
  },
  taskCountText: {
    fontSize: 14,
    color: '#8FA3BF',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E8F0FA',
    gap: 6,
  },
  exportButtonText: {
    fontSize: 13,
    color: '#1F4E8C',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
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
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F4F7FB',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteOptionText: {
    flex: 1,
    marginRight: 10,
  },
  deleteOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  deleteOptionSubtitle: {
    fontSize: 11,
    color: '#8FA3BF',
  },
  workersList: {
    maxHeight: 300,
    marginBottom: 16,
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
    borderBottomColor: '#E2E8F0',
  },
  workerItemSelected: {
    backgroundColor: '#F4F7FB',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  taskCount: {
    fontSize: 12,
    color: '#8FA3BF',
    marginTop: 2,
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
    backgroundColor: '#1F4E8C',
    borderColor: '#1F4E8C',
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
  exportModalButton: {
    backgroundColor: '#1F4E8C',
  },
  exportButtonDisabled: {
    backgroundColor: '#8FA3BF',
  },
  exportModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default CompletedTasksTab;
