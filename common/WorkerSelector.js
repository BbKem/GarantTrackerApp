import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const WorkerSelector = ({ selectedWorker, workers, setSelectedWorker }) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Выберите работника:</Text>
      <Picker
        selectedValue={selectedWorker}
        onValueChange={setSelectedWorker}
        style={styles.picker}
        dropdownIconColor="#007AFF"
        mode="dropdown"
      >
        {workers.map(worker => (
          <Picker.Item 
            key={worker.username} 
            label={worker.username} 
            value={worker.username} 
          />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 40,
    justifyContent: 'center',
  },
});

export default WorkerSelector;