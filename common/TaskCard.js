import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TaskCard = ({ task, children, completed = false, isPending = false }) => {
  // Определяем статус
  const getStatus = () => {
    if (completed) return 'Завершена';
    if (isPending) return 'На проверке';
    return 'Активна';
  };

  const status = getStatus();

  // Определяем стиль бейджа
  const getBadgeStyle = () => {
    if (completed) return styles.completedBadge;
    if (isPending) return styles.pendingBadge;
    return styles.activeBadge;
  };

  const getStatusTextStyle = () => {
    if (completed) return styles.completedStatusText;
    if (isPending) return styles.pendingStatusText;
    return styles.activeStatusText;
  };

  return (
    <View style={[
      styles.taskCard,
      completed && styles.completedTask
    ]}>
      {/* Заголовок и статус в одной строке */}
      <View style={styles.cardHeader}>
        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={[styles.statusBadge, getBadgeStyle()]}>
          <Text style={[styles.statusText, getStatusTextStyle()]}>
            {status}
          </Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Адрес:</Text>
        <Text style={styles.infoValue}>{task.location}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Время:</Text>
        <Text style={styles.infoValue}>{task.time}</Text>
      </View>
      
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  completedTask: {
    backgroundColor: '#F8FAFE',
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: '#E8F0FA',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeStatusText: {
    color: '#1F4E8C',
  },
  completedStatusText: {
    color: '#4CAF50',
  },
  pendingStatusText: {
    color: '#FF9800',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
     alignItems: 'flex-start',
  },
  infoLabel: {
    width: 55,
    fontSize: 13,
    color: '#8FA3BF',
    fontWeight: '500',
    lineHeight: 20, 
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 21,
  },
});

export default TaskCard;