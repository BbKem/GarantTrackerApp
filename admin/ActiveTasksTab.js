// admin/ActiveTasksTab.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';
import { Ionicons } from '@expo/vector-icons';

const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker, pendingConfirmations }) => {
  // Фильтруем активные задачи для выбранного работника
  const activeTasks = tasks.filter(t => t.assignedTo === selectedWorker && !t.completed);

  // Функция для получения статуса задачи
  const getTaskStatus = (task) => {
    const hasPendingArrival = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'arrival' && p.status === 'pending'
    );
    const hasPendingCompletion = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'completion' && p.status === 'pending'
    );

    if (hasPendingArrival || hasPendingCompletion) return 'pending';
    if (task.isOnSite) return 'onSite';
    return 'offSite';
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'На проверке', color: '#FF9800', icon: 'time-outline' };
      case 'onSite':
        return { text: 'На месте', color: '#4CAF50', icon: 'location-outline' };
      default:
        return { text: 'Не подтверждено', color: '#FF6B6B', icon: 'alert-circle-outline' };
    }
  };

  const renderTaskItem = ({ item }) => {
    const status = getTaskStatus(item);
    const statusConfig = getStatusConfig(status);
    const isPending = status === 'pending';

    return (
      <TaskCard task={item} isPending={isPending}>
        {/* Статус задачи с иконкой */}
        <View style={styles.statusContainer}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>

        {item.lastChecked && !isPending && (
          <View style={styles.lastCheckedContainer}>
            <Ionicons name="refresh-outline" size={12} color="#8FA3BF" />
            <Text style={styles.lastChecked}>
              Последняя проверка: {new Date(item.lastChecked).toLocaleString()}
            </Text>
          </View>
        )}
      </TaskCard>
    );
  };

  return (
    <View style={styles.tabContainer}>
      {/* Сначала выбор работника */}
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      {/* Затем счётчик активных задач */}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingBottom: 12,
    backgroundColor: '#F4F7FB',
  },
  taskCountText: {
    fontSize: 14,
    color: '#8FA3BF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  lastCheckedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  lastChecked: {
    fontSize: 11,
    color: '#8FA3BF',
  },
});

export default ActiveTasksTab;