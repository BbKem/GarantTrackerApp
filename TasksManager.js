import React, { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from './config';
import AdminPanel from './admin/AdminPanel';
import WorkerPanel from './worker/WorkerPanel';

const TasksManager = ({ user, onSignOut }) => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    const handleDataChange = (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.val();
      const allTasks = [];
      
      Object.entries(data).forEach(([workerId, workerTasks]) => {
        Object.entries(workerTasks).forEach(([taskId, task]) => {
          allTasks.push({
            id: taskId,
            assignedTo: workerId,
            ...task
          });
        });
      });
      
      setTasks(allTasks);
    };

    onValue(tasksRef, handleDataChange);
    return () => off(tasksRef);
  }, []);

  if (user.userType === 'admin') {
    return (
      <AdminPanel 
        user={user} 
        onSignOut={onSignOut}
        tasks={tasks}
      />
    );
  } else {
    return (
      <WorkerPanel 
        user={user} 
        onSignOut={onSignOut}
        tasks={tasks}
      />
    );
  }
};

export default TasksManager;