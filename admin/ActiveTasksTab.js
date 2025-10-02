import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WorkerSelector from '../common/WorkerSelector';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const ActiveTasksTab = ({ tasks, selectedWorker, workers, setSelectedWorker }) => {
  const activeTasks = tasks.filter(t => t.assignedTo === selectedWorker && !t.completed);

  const renderTaskItem = ({ item }) => {
    return (
      <TaskCard task={item}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            item.isOnSite ? styles.statusOnSite : styles.statusOffSite
          ]}/>
          <Text>
            {item.isOnSite 
              ? `На месте (${item.lastChecked ? new Date(item.lastChecked).toLocaleTimeString() : 'нет данных'})` 
              : 'Не подтверждено'}
          </Text>
        </View>
      </TaskCard>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Активные задачи ({activeTasks.length})</Text>
      
      <WorkerSelector 
        selectedWorker={selectedWorker}
        workers={workers}
        setSelectedWorker={setSelectedWorker}
      />

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
  tabHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnSite: {
    backgroundColor: '#4CAF50',
  },
  statusOffSite: {
    backgroundColor: '#F44336',
  },
});

export default ActiveTasksTab;