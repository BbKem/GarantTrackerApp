import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import TaskList from '../common/TaskList';
import TaskCard from '../common/TaskCard';

const WorkerActiveTasksTab = ({ tasks, user, loadingTasks, progressTasks, onConfirmLocation, onCompleteTask }) => {
  const activeTasks = tasks.filter(t => t.assignedTo === user.username && !t.completed);

  const renderTaskItem = ({ item }) => {
    const isLoading = loadingTasks[item.id] || false;
    const progress = progressTasks[item.id] || 0;

    return (
      <TaskCard task={item}>
        {isLoading && (
          <View style={styles.progressContainer}>
            <Text>Определяем местоположение... {progress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${progress}%`}]}/>
            </View>
          </View>
        )}

        {!item.completed && (
          <View style={styles.buttonGroup}>
            <Button
              title={isLoading ? "Проверка..." : "Подтвердить местоположение"}
              onPress={() => onConfirmLocation(item)}
              color="#4CAF50"
              disabled={isLoading}
            />
            <View style={styles.buttonSpacer} />
            <Button
              title="Завершить задачу"
              onPress={() => onCompleteTask(item)}
              color="#2196F3"
              disabled={!item.isOnSite || isLoading}
            />
          </View>
        )}

        {item.completed && (
          <Text style={styles.completedText}>✔ Задача завершена</Text>
        )}
      </TaskCard>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabHeader}>Активные задачи ({activeTasks.length})</Text>
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
  buttonGroup: {
    marginTop: 10,
  },
  buttonSpacer: {
    height: 8,
  },
  progressContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  completedText: {
    color: '#4CAF50',
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WorkerActiveTasksTab;