// admin/ActiveTasksTab.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker, pendingConfirmations }) => {

  const activeTasks = tasks.filter(
    t => t.assignedTo === selectedWorker && !t.completed
  );

  const getTaskStatus = (task) => {
    const pendingArrival = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'arrival'
    );

    const pendingCompletion = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'completion'
    );

    if (task.completed) return 'completed';
    if (pendingCompletion) return 'pendingCompletion';
    if (pendingArrival) return 'pendingArrival';
    if (task.isOnSite) return 'onSite';

    return 'offSite';
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pendingArrival':
        return { text: 'Проверка прибытия', color: '#FF9800' };
      case 'pendingCompletion':
        return { text: 'Проверка завершения', color: '#FF9800' };
      case 'onSite':
        return { text: 'На месте', color: '#4CAF50' };
      default:
        return { text: 'Не подтверждено', color: '#FF6B6B' };
    }
  };

  const renderTaskItem = ({ item }) => {
    const status = getTaskStatus(item);
    const config = getStatusConfig(status);

    return (
      <TaskCard task={item}>
        <Text style={{ color: config.color }}>{config.text}</Text>
      </TaskCard>
    );
  };

  return (
    <View style={styles.container}>
      <WorkerSelector
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <Text style={styles.count}>
        Всего: {activeTasks.length}
      </Text>

      <TaskList
        tasks={activeTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет задач"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  count: { marginBottom: 10, color: '#8FA3BF' },
});

export default ActiveTasksTab;