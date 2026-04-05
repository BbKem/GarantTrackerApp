// common/TaskList.js
import React from 'react';
import { FlatList, Text, StyleSheet } from 'react-native';

// ✅ Добавляем extraData в пропсы
const TaskList = ({ tasks, renderTaskItem, emptyMessage, extraData }) => {
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
      extraData={extraData} // ✅ Критично для реактивного обновления
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