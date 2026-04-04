// admin/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../config';

import ProfileModal from '../common/ProfileModal';
import AddTaskTab from './AddTaskTab';
import ActiveTasksTab from './ActiveTasksTab';
import CompletedTasksTab from './CompletedTasksTab';
import PhotoConfirmationsTab from './PhotoConfirmationsTab';

const AdminPanel = ({ user, onSignOut }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState([]);
  const [activeTab, setActiveTab] = useState('add');
  const [profileVisible, setProfileVisible] = useState(false);

  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  // ✅ TASKS realtime
  useEffect(() => {
    const tasksRef = ref(db, 'tasks');

    onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allTasks = [];

        Object.entries(data).forEach(([workerId, workerTasks]) => {
          Object.entries(workerTasks).forEach(([taskId, task]) => {
            allTasks.push({
              id: taskId,
              workerId,
              ...task,
            });
          });
        });

        setTasks(allTasks);
      } else {
        setTasks([]);
      }
    });

    return () => off(tasksRef);
  }, []);

  // ✅ CONFIRMATIONS realtime
  useEffect(() => {
    const confirmationsRef = ref(db, 'photoConfirmations');

    onValue(confirmationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        const pendingList = Object.entries(data)
          .map(([id, conf]) => ({ id, ...conf }))
          .filter(conf => conf.status === 'pending');

        setPendingConfirmations(pendingList);
        setPendingCount(pendingList.length);
      } else {
        setPendingConfirmations([]);
        setPendingCount(0);
      }
    });

    return () => off(confirmationsRef);
  }, []);

  // ✅ WORKERS realtime
  useEffect(() => {
    const workersRef = ref(db, 'users');

    onValue(workersRef, (snapshot) => {
      if (snapshot.exists()) {
        const workersData = Object.entries(snapshot.val())
          .filter(([_, data]) => data.userType === 'worker')
          .map(([username]) => ({ username }));

        setWorkers(workersData);

        if (workersData.length && !selectedWorker) {
          setSelectedWorker(workersData[0].username);
        }
      }
    });

    return () => off(workersRef);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'add':
        return (
          <AddTaskTab
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
          />
        );
      case 'active':
        return (
          <ActiveTasksTab
            tasks={tasks}
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
            pendingConfirmations={pendingConfirmations}
          />
        );
      case 'completed':
        return (
          <CompletedTasksTab
            tasks={tasks}
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
          />
        );
      case 'photos':
        return <PhotoConfirmationsTab />;
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'add': return 'Добавление задачи';
      case 'active': return 'Активные задачи';
      case 'completed': return 'Завершённые задачи';
      case 'photos': return 'Фото-подтверждения';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo.png')} style={styles.logoImage} />
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setProfileVisible(true)}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
          ) : (
            <Ionicons name="person-circle" size={44} color="#1F4E8C" />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.tabTitle}>{getTabTitle()}</Text>

      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      <View style={styles.bottomNavigation}>
        {[
          { key: 'add', icon: 'add-circle-outline', label: 'Добавить' },
          { key: 'active', icon: 'play-circle-outline', label: 'Активные' },
          { key: 'completed', icon: 'checkmark-done-circle-outline', label: 'Завершённые' },
          { key: 'photos', icon: 'camera-outline', label: 'Фото' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.navButton, activeTab === tab.key && styles.activeNavButton]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={activeTab === tab.key ? '#1F4E8C' : '#8FA3BF'}
            />
            <Text style={[styles.navText, activeTab === tab.key && styles.activeNavText]}>
              {tab.label}
            </Text>

            {tab.key === 'photos' && pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ProfileModal
        visible={profileVisible}
        user={user}
        onClose={() => setProfileVisible(false)}
        onSignOut={onSignOut}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoContainer: { alignItems: 'center' },
  logoImage: { width: 120, height: 120 },
  profileButton: { position: 'absolute', right: 16, top: 50 },
  profileImage: { width: 44, height: 44, borderRadius: 22 },

  tabTitle: { textAlign: 'center', padding: 10, color: '#1F4E8C' },
  tabContent: { flex: 1, padding: 16 },

  bottomNavigation: { flexDirection: 'row', backgroundColor: '#fff', padding: 10 },
  navButton: { flex: 1, alignItems: 'center' },
  activeNavButton: { backgroundColor: '#F4F7FB' },

  navText: { fontSize: 12, color: '#8FA3BF' },
  activeNavText: { color: '#1F4E8C' },

  badge: {
    position: 'absolute',
    top: -5,
    right: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 10 },
});

export default AdminPanel;