import { ref, push, onValue, query, orderByChild, startAt, off } from 'firebase/database';
import { db } from '../config';

class NotificationService {
  constructor() {
    this.notificationsRef = ref(db, 'notifications');
  }

  // Создание уведомления
  async createNotification(type, data, recipient = 'admin') {
    const notification = {
      type,
      data,
      recipient,
      timestamp: Date.now(),
      read: false,
      title: this.getNotificationTitle(type),
      message: this.generateMessage(type, data)
    };

    try {
      await push(this.notificationsRef, notification);
      return true;
    } catch (error) {
      console.error('Ошибка создания уведомления:', error);
      return false;
    }
  }

  // Получение заголовка уведомления
  getNotificationTitle(type) {
    const titles = {
      TASK_OVERDUE: 'Просроченная задача',
      WORKER_ARRIVED: 'Работник прибыл на место',
      TASK_COMPLETED: 'Задача завершена',
      TASK_CREATED: 'Новая задача создана',
      LOCATION_CONFIRMED: 'Местоположение подтверждено'
    };
    return titles[type] || 'Новое уведомление';
  }

  // Генерация сообщения уведомления
  generateMessage(type, data) {
    switch (type) {
      case 'TASK_OVERDUE':
        return `Задача "${data.taskTitle}" просрочена для работника ${data.workerName}`;
      
      case 'WORKER_ARRIVED':
        return `Работник ${data.workerName} прибыл на место выполнения задачи "${data.taskTitle}"`;
      
      case 'TASK_COMPLETED':
        return `Работник ${data.workerName} завершил задачу "${data.taskTitle}"`;
      
      case 'TASK_CREATED':
        return `Создана новая задача "${data.taskTitle}" для работника ${data.workerName}`;
      
      case 'LOCATION_CONFIRMED':
        return `Работник ${data.workerName} подтвердил местоположение для задачи "${data.taskTitle}"`;
      
      default:
        return 'Новое событие в системе';
    }
  }

  // Отметка уведомления как прочитанного
  async markAsRead(notificationId) {
    try {
      const notificationRef = ref(db, `notifications/${notificationId}`);
      await update(notificationRef, { read: true });
      return true;
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
      return false;
    }
  }

  // Удаление уведомления
  async deleteNotification(notificationId) {
    try {
      const notificationRef = ref(db, `notifications/${notificationId}`);
      await remove(notificationRef);
      return true;
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
      return false;
    }
  }

  // Подписка на уведомления
  subscribeToNotifications(callback, recipient = 'admin') {
    const notificationsQuery = query(
      this.notificationsRef,
      orderByChild('recipient'),
      startAt(recipient)
    );

    onValue(notificationsQuery, (snapshot) => {
      const notifications = [];
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().recipient === recipient) {
          notifications.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        }
      });
      
      notifications.sort((a, b) => b.timestamp - a.timestamp);
      callback(notifications);
    });

    return () => off(notificationsQuery);
  }
}

export default new NotificationService();