import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ref, onValue, off } from 'firebase/database';
import { db } from './config';
import AdminPanel from './admin/AdminPanel';
import WorkerPanel from './worker/WorkerPanel';

const TasksManager = ({ user, onSignOut }) => {
  const [tasks, setTasks] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    const handleDataChange = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allTasks = [];
        Object.entries(data).forEach(([workerId, workerTasks]) => {
          Object.entries(workerTasks).forEach(([taskId, task]) => {
            allTasks.push({ id: taskId, assignedTo: workerId, ...task });
          });
        });
        setTasks(allTasks);
      } else {
        setTasks([]);
      }
      // Первый пакет данных получен → разрешаем показ интерфейса
      setDataReady(true);
    };

    const unsubscribe = onValue(tasksRef, handleDataChange);
    return () => off(tasksRef);
  }, []);

  if (!dataReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F4E8C" />
      </View>
    );
  }

  if (user.userType === 'admin') {
    return <AdminPanel user={user} onSignOut={onSignOut} tasks={tasks} />;
  }
  return <WorkerPanel user={user} onSignOut={onSignOut} tasks={tasks} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
  },
});

export default TasksManager;