import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator, Image } from 'react-native';

const WorkerSelector = ({ selectedWorker, workers, setSelectedWorker, workersLoading = false }) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  
  const selectedWorkerName = workersLoading 
    ? 'Загрузка...' 
    : workers.find(w => w.username === selectedWorker)?.username || 'Не выбран';

  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker.username);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Работник</Text>
    <TouchableOpacity
  style={[styles.selector, workersLoading && styles.selectorDisabled]}
  onPress={() => !workersLoading && setModalVisible(true)}
  disabled={workersLoading}
>
  <Text style={[styles.selectedText, workersLoading && styles.selectedTextLoading]}>
    {selectedWorkerName}
  </Text>
  {workersLoading ? (
    <ActivityIndicator size="small" color="#8FA3BF" />
  ) : (
    <Image source={require('../assets/free-icon-down-arrow-2985150.png')} style={{ width: 20, height: 20, tintColor: '#8FA3BF' }} />
  )}
</TouchableOpacity>
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={!workersLoading && modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите работника</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Image source={require('../assets/free-icon-close-4013407.png')} style={{ width: 20, height: 20, tintColor: '#8FA3BF' }} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={workers}
              keyExtractor={(item) => item.username}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.workerItem,
                    selectedWorker === item.username && styles.workerItemSelected
                  ]}
                  onPress={() => handleSelectWorker(item)}
                >
                  <View style={styles.workerInfo}>
                        <Image source={require('../assets/free-icon-user-456212.png')} style={{ width: 15, height: 15, tintColor: '#1F4E8C' }} />
                    <Text style={styles.workerName}>{item.username}</Text>
                  </View>
                  {selectedWorker === item.username && (
                    <Image source={require('../assets/free-icon-checkmarks-11229517.png')} style={{ width: 18, height: 18, tintColor: '#1F4E8C' }} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', color: '#1A1A1A', marginBottom: 6 },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: '#FFFFFF',
  },
  selectorDisabled: { backgroundColor: '#F8FAFE', opacity: 0.7 },
  selectedText: { fontSize: 15, color: '#1A1A1A' },
  selectedTextLoading: { color: '#8FA3BF', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '85%', maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  workerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  workerItemSelected: { backgroundColor: '#F4F7FB' },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workerName: { fontSize: 16, color: '#1A1A1A' },
  separator: { height: 1, backgroundColor: '#E2E8F0', marginLeft: 20 },
});

export default WorkerSelector;