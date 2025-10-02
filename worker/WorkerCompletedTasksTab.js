import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const WorkerCompletedTasksTab = ({ tasks, user }) => {
  const completedTasks = tasks.filter(t => t.assignedTo === user.username && t.completed);

  const renderTaskItem = ({ item }) => {
    return (
      <TaskCard task={item} completed={true}>
        <Text style={styles.completionTime}>
          Завершено: {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'нет данных'}
        </Text>
      </TaskCard>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Завершенные задачи ({completedTasks.length})</Text>
      <TaskList 
        tasks={completedTasks}
        renderTaskItem={renderTaskItem}
        emptyMessage="Нет завершенных задач"
      />
    </View>
  );
};

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
});

export default WorkerCompletedTasksTab;