import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, get, onValue, off } from 'firebase/database';
import { db } from '../config';
import ProfileModal from '../common/ProfileModal';
import AddTaskTab from './AddTaskTab';
import ActiveTasksTab from './ActiveTasksTab';
import CompletedTasksTab from './CompletedTasksTab';

const AdminPanel = ({ user, onSignOut, tasks }) => {
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState([]);
  const [activeTab, setActiveTab] = useState('add');
  const [profileVisible, setProfileVisible] = useState(false);

  useEffect(() => {
    const workersRef = ref(db, 'users');
    get(workersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const workersData = Object.entries(snapshot.val())
          .filter(([_, data]) => data.userType === 'worker')
          .map(([username]) => ({ username }));
        setWorkers(workersData);
        if (workersData.length) setSelectedWorker(workersData[0].username);
      }
    });
  }, [user]);

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
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => setProfileVisible(true)}
      >
        {user?.photoURL ? (
          <Image 
            source={{ uri: user.photoURL }} 
            style={styles.profileImage}
          />
        ) : (
          <Ionicons name="person-circle" size={32} color="#007AFF" />
      )}
  </TouchableOpacity>

      <Text style={styles.header}>Панель администратора</Text>
      
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'add' && styles.activeNavButton]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.navText, activeTab === 'add' && styles.activeNavText]}>
            Добавить
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'active' && styles.activeNavButton]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.navText, activeTab === 'active' && styles.activeNavText]}>
            Активные
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'completed' && styles.activeNavButton]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.navText, activeTab === 'completed' && styles.activeNavText]}>
            Завершенные
          </Text>
        </TouchableOpacity>
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

  profileImage: {
  width: 32,
  height: 32,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#007AFF',
  },
  
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
  profileButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  tabContent: {
    flex: 1,
    marginBottom: 70,
  },
  bottomNavigation: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeNavButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  navText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AdminPanel;