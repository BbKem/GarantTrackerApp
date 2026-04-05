import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker, pendingConfirmations }) => {
  // Функция для получения статуса задачи - обновляем чтобы всегда проверяла свежие данные
  const getTaskStatus = useCallback((task) => {
    // Проверяем ожидающие подтверждения
    const hasPendingArrival = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'arrival' && p.status === 'pending'
    );
    const hasPendingCompletion = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'completion' && p.status === 'pending'
    );

    if (hasPendingArrival || hasPendingCompletion) return 'pending';
    if (task.isOnSite) return 'onSite';
    return 'offSite';
  }, [pendingConfirmations]);

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

  // Фильтруем активные задачи для выбранного работника
  const activeTasks = tasks.filter(t => t.assignedTo === selectedWorker && !t.completed);

  const renderTaskItem = useCallback(({ item }) => {
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
  }, [getTaskStatus]);

  return (
    <View style={styles.tabContainer}>
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <View style={styles.headerSection}>
        <Text style={styles.taskCountText}>
          📋 Всего активных задач: {activeTasks.length}
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