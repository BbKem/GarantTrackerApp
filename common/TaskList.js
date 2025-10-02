import React from 'react';
import { FlatList, Text, StyleSheet } from 'react-native';

const TaskList = ({ tasks, renderTaskItem, emptyMessage }) => {
  if (tasks.length === 0) {
    return (
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    );
  }

  return (
    <FlatList
      data={tasks}
      renderItem={renderTaskItem}
      keyExtractor={item => item.id}
      scrollEnabled={true}
      style={styles.taskList}
    />
  );
};

const styles = StyleSheet.create({
  taskList: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});

export default TaskList;