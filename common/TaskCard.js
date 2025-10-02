import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TaskCard = ({ task, children, completed = false }) => {
  return (
    <View style={[
      styles.taskCard,
      completed && styles.completedTask
    ]}>
      <Text style={styles.taskTitle}>{task.title}</Text>
      <Text>Адрес: {task.location}</Text>
      <Text>Время: {task.time}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  completedTask: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  taskTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
});

export default TaskCard;