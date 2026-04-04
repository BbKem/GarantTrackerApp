// admin/ActiveTasksTab.js
import React from 'react';
import { View, Text } from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker, pendingConfirmations }) => {

  const activeTasks = tasks.filter(
    t => t.assignedTo === selectedWorker && !t.completed
  );

  const getTaskStatus = (task) => {
    const pendingArrival = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'arrival' && p.status === 'pending'
    );

    const pendingCompletion = pendingConfirmations?.some(
      p => p.taskId === task.id && p.type === 'completion' && p.status === 'pending'
    );

    if (pendingCompletion) return 'pendingCompletion';
    if (pendingArrival) return 'pendingArrival';
    if (task.isOnSite) return 'onSite';

    return 'offSite';
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pendingArrival': return 'Проверка прибытия';
      case 'pendingCompletion': return 'Проверка завершения';
      case 'onSite': return 'На месте';
      default: return 'Не подтверждено';
    }
  };

  const renderTaskItem = ({ item }) => {
    const status = getTaskStatus(item);

    return (
      <TaskCard task={item}>
        <Text>{getStatusText(status)}</Text>
      </TaskCard>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <WorkerSelector
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

      <TaskList
        tasks={activeTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет задач"
      />
    </View>
  );
};

export default ActiveTasksTab;