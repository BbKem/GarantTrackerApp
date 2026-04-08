// admin/AdminPanel.js - исправленная версия
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { ref, get, onValue, off } from 'firebase/database';
import { db } from '../config';
import ProfileModal from '../common/ProfileModal';
import AddTaskTab from './AddTaskTab';
import ActiveTasksTab from './ActiveTasksTab';
import CompletedTasksTab from './CompletedTasksTab';
import PhotoConfirmationsTab from './PhotoConfirmationsTab';

const AdminPanel = ({ user, onSignOut, tasks }) => {
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(true); 
  const [activeTab, setActiveTab] = useState('add');
  const [profileVisible, setProfileVisible] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  const confirmationsRef = ref(db, 'photoConfirmations');
  const unsubscribe = onValue(confirmationsRef, (snapshot) => {
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
  // ✅ Безопасное отключение ТОЛЬКО этого слушателя
  return () => off(confirmationsRef, 'value', unsubscribe);
}, []);

  useEffect(() => {
  const workersRef = ref(db, 'users');
  const unsubscribe = onValue(workersRef, (snapshot) => {
    if (snapshot.exists()) {
      const workersData = Object.entries(snapshot.val())
        .filter(([_, data]) => data.userType === 'worker')
        .map(([username]) => ({ username }));
      
      setWorkers(workersData);
      if (workersData.length && !selectedWorker) {
        setSelectedWorker(workersData[0].username);
      }
    } else {
      setWorkers([]);
    }
    setWorkersLoading(false); // ✅ Сбрасываем флаг загрузки
  });
  return () => off(workersRef, 'value', unsubscribe); // ✅ Безопасное отключение
}, []); 

  const renderTabContent = () => {
    switch (activeTab) {
      case 'add':
        return (
          <AddTaskTab
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
            workersLoading={workersLoading}
          />
        );  
      case 'active':
        return (
          <ActiveTasksTab
          key={selectedWorker}
            tasks={tasks}
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
            pendingConfirmations={pendingConfirmations}
            workersLoading={workersLoading}
          />
        );
      case 'completed':
        return (
          <CompletedTasksTab
            tasks={tasks}
            selectedWorker={selectedWorker}
            workers={workers}
            setSelectedWorker={setSelectedWorker}
            workersLoading={workersLoading}
          />
        );
      case 'photos':
        return <PhotoConfirmationsTab />;
      default:
        return null;
    }
  };

  // Получаем название текущей вкладки
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
      {/* Шапка с логотипом по центру и профилем справа */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
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
            <Image source={require('../assets/free-icon-profile-9344418.png')} style={{ width: 32, height: 32,  tintColor: '#1F4E8C'}} />
          )}
        </TouchableOpacity>
      </View>

      {/* Заголовок текущей вкладки */}
      <Text style={styles.tabTitle}>{getTabTitle()}</Text>
      
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      {/* Нижняя навигация */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'add' && styles.activeNavButton]}
          onPress={() => setActiveTab('add')}
        >
         <Image source={require('../assets/free-icon-plus-3303893.png')} style={{ width: 22, height: 22, tintColor: activeTab === 'add' ? '#1F4E8C' : '#8FA3BF'}} />
          <Text style={[styles.navText, activeTab === 'add' && styles.activeNavText]}>
            Добавить
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'active' && styles.activeNavButton]}
          onPress={() => setActiveTab('active')}
        >
           <Image source={require('../assets/activ_icon.png')} style={{ width: 22, height: 22, tintColor: activeTab === 'active' ? '#1F4E8C' : '#8FA3BF'}} />
          <Text style={[styles.navText, activeTab === 'active' && styles.activeNavText]}>
            Активные
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'completed' && styles.activeNavButton]}
          onPress={() => setActiveTab('completed')}
        >
           <Image source={require('../assets/zavercheno_icon.png')} style={{ width: 22, height: 22, tintColor: activeTab === 'completed' ? '#1F4E8C' : '#8FA3BF'}} />
          <Text style={[styles.navText, activeTab === 'completed' && styles.activeNavText]}>
            Завершённые
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'photos' && styles.activeNavButton]}
          onPress={() => setActiveTab('photos')}
        >
          <View style={styles.photoNavContent}>
             <Image source={require('../assets/free-icon-camera-685655.png')} style={{ width: 22, height: 22, tintColor: activeTab === 'photos' ? '#1F4E8C' : '#8FA3BF'}} />
            <Text style={[styles.navText, activeTab === 'photos' && styles.activeNavText]}>
              Фото
            </Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
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
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    height: 150,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  profileButton: {
    position: 'absolute',
    right: 16,
    top: 50,
    bottom: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#1F4E8C',
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
    color: '#1F4E8C',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeNavButton: {
    backgroundColor: '#F4F7FB',
  },
  navText: {
    fontSize: 12,
    color: '#8FA3BF',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#1F4E8C',
    fontWeight: '600',
  },
  photoNavContent: {
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default AdminPanel;