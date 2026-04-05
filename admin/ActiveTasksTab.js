// admin/ActiveTasksTab.js - добавляем кнопку обновления
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker, pendingConfirmations, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [localTasks, setLocalTasks] = useState([]);

  useEffect(() => {
    const filtered = tasks.filter(t => t.assignedTo === selectedWorker && !t.completed);
    setLocalTasks(filtered);
  }, [tasks, selectedWorker, pendingConfirmations]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  };

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
        return { text: 'На проверке', color: '#FF9800', icon: '⏳' };
      case 'onSite':
        return { text: 'На месте', color: '#4CAF50', icon: '📍' };
      default:
        return { text: 'Не подтверждено', color: '#FF6B6B', icon: '⚠️' };
    }
  };

  const renderTaskItem = ({ item }) => {
    const status = getTaskStatus(item);
    const statusConfig = getStatusConfig(status);
    const isPending = status === 'pending';

    return (
      <TaskCard task={item} isPending={isPending}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>

        {item.lastChecked && !isPending && (
          <View style={styles.lastCheckedContainer}>
            <Text style={styles.lastCheckedIcon}>🔄</Text>
            <Text style={styles.lastChecked}>
              Последняя проверка: {new Date(item.lastChecked).toLocaleString()}
            </Text>
          </View>
        )}
      </TaskCard>
    );
  };

  return (
    <ScrollView
      style={styles.tabContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1F4E8C']} />
      }
    >
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <View style={styles.headerSection}>
        <Text style={styles.taskCountText}>
          📋 Всего активных задач: {localTasks.length}
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>🔄 Обновить</Text>
        </TouchableOpacity>
      </View>

      <TaskList 
        tasks={localTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет активных задач"
      />
    </ScrollView>
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
    paddingHorizontal: 0,
    paddingBottom: 12,
    backgroundColor: '#F4F7FB',
  },
  taskCountText: {
    fontSize: 14,
    color: '#8FA3BF',
  },
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F0FA',
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 13,
    color: '#1F4E8C',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  statusIcon: {
    fontSize: 14,
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
  lastCheckedIcon: {
    fontSize: 11,
  },
  lastChecked: {
    fontSize: 11,
    color: '#8FA3BF',
  },
});

export default ActiveTasksTab;