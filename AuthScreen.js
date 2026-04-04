import { View, Text, StyleSheet, TextInput, ActivityIndicator, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { db } from './config';
import { ref, get, set, remove } from 'firebase/database';

// Веб-совместимые алерты
const showAlert = (title, message, buttons = null) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // Для confirm диалога
      if (buttons[0].style === 'destructive' || buttons[1]?.style === 'destructive') {
        const result = window.confirm(`${title}\n\n${message}`);
        if (result && buttons[1]?.onPress) {
          buttons[1].onPress();
        } else if (!result && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
        return;
      }
      // Для обычных алертов
      window.alert(`${title}\n\n${message}`);
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    const Alert = require('react-native').Alert;
    if (buttons) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message);
    }
  }
};

const AuthScreen = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [newUserType, setNewUserType] = useState('worker');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(([key, value]) => ({
          username: key,
          userType: value.userType,
          password: value.password
        })).filter(user => user.userType !== 'master');
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    } catch (error) {
      showAlert('Ошибка', 'Не удалось загрузить список пользователей');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(db, `users/${username}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        if (userData.userType === 'master') {
          if (userData.password === password) {
            setIsRegisterMode(true);
            setUsername('');
            setPassword('');
            setIsLoading(false);
            return;
          } else {
            showAlert('Ошибка', 'Неверный пароль');
            setIsLoading(false);
            return;
          }
        }
        
        if (userData.password === password) {
          onAuthSuccess({ 
            username, 
            userType: userData.userType,
            photoURL: userData.photoURL 
          });
        } else {
          showAlert('Ошибка', 'Неверный пароль');
        }
      } else {
        showAlert('Ошибка', 'Пользователь не найден');
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Ошибка', 'Проблема с подключением');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterUser = async () => {
    if (!username || !password) {
      showAlert('Ошибка', 'Заполните все поля');
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(db, `users/${username}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        showAlert('Ошибка', 'Пользователь уже существует');
      } else {
        await set(userRef, {
          username,
          password,
          userType: newUserType
        });
        
        showAlert('Успех', `Пользователь ${username} (${newUserType === 'admin' ? 'администратор' : 'работник'}) создан`);
        
        setUsername('');
        setPassword('');
        setNewUserType('worker');
        
        if (isDeleteMode) {
          loadUsers();
        }
      }
    } catch (error) {
      console.error('Register error:', error);
      showAlert('Ошибка', 'Не удалось создать пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (userToDelete) => {
    const confirmDelete = () => {
      showAlert(
        'Подтверждение удаления',
        `Вы уверены, что хотите удалить пользователя ${userToDelete.username}?`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                const userRef = ref(db, `users/${userToDelete.username}`);
                await remove(userRef);
                showAlert('Успех', `Пользователь ${userToDelete.username} удален`);
                loadUsers();
              } catch (error) {
                console.error('Delete error:', error);
                showAlert('Ошибка', 'Не удалось удалить пользователя');
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    };
    
    confirmDelete();
  };

  const openDeleteMode = () => {
    setIsDeleteMode(true);
    loadUsers();
  };

  // Режим удаления пользователей
  if (isDeleteMode) {
    return (
      <View style={styles.container}>
        <View style={styles.deleteContainer}>
          <View style={styles.headerBlock}>
            <Image 
              source={require('./assets/logo.png')}
              style={styles.logoSmallDel}
              resizeMode="contain"
            />
          </View>

          <View style={styles.infoCardDelete}>
            <Text style={styles.infoText}>Список всех пользователей системы</Text>
          </View>

          {loadingUsers ? (
            <ActivityIndicator size="large" color="#1F4E8C" style={styles.loader} />
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.username}
              style={styles.userListDelete}
              contentContainerStyle={styles.userListContentDelete}
              renderItem={({ item }) => (
                <View style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.username}</Text>
                    <View style={[
                      styles.userTypeBadge,
                      item.userType === 'admin' ? styles.adminBadge : styles.workerBadge
                    ]}>
                      <Text style={styles.userTypeText}>
                        {item.userType === 'admin' ? 'Администратор' : 'Работник'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(item)}
                  >
                    <Text style={styles.deleteButtonText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Нет пользователей</Text>
              }
            />
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.backButtonDelete]}
            onPress={() => {
              setIsDeleteMode(false);
              setUsername('');
              setPassword('');
            }}
          >
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Режим регистрации
  if (isRegisterMode) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerBlock}>
            <Image 
              source={require('./assets/logo.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Создание учетной записи для нового сотрудника</Text>
          </View>
          
          <View style={styles.formCard}>
            <TextInput
              placeholder="Логин"
              placeholderTextColor="#8FA3BF"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
              maxLength={20}
            />
            
            <TextInput
              placeholder="Пароль"
              placeholderTextColor="#8FA3BF"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              maxLength={30}
            />
            
            <Text style={styles.radioLabel}>Тип пользователя</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.radioOption, newUserType === 'worker' && styles.radioOptionActive]}
                onPress={() => setNewUserType('worker')}>
                <Text style={[styles.radioText, newUserType === 'worker' && styles.radioTextActive]}>
                  Работник
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.radioOption, newUserType === 'admin' && styles.radioOptionActive]}
                onPress={() => setNewUserType('admin')}>
                <Text style={[styles.radioText, newUserType === 'admin' && styles.radioTextActive]}>
                  Администратор
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRegisterUser}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Создать пользователя</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteModeButton]}
              onPress={openDeleteMode}
            >
              <Text style={styles.actionButtonText}>Управление пользователями</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.backButton]}
              onPress={() => {
                setIsRegisterMode(false);
                setUsername('');
                setPassword('');
              }}
            >
              <Text style={styles.backButtonText}>Назад к входу</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Основной экран входа
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <Image 
            source={require('./assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.loginCard}>
          <TextInput
            placeholder="Логин"
            placeholderTextColor="#8FA3BF"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />
          
          <TextInput
            placeholder="Пароль"
            placeholderTextColor="#8FA3BF"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
          
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Войти в систему</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoImage: {
    width: 250,
    height: 250,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  loginButton: {
    backgroundColor: '#1F4E8C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#8FA3BF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  headerBlock: {
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#F4F7FB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    color: '#1F4E8C',
    fontSize: 13,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radioLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    color: '#1A1A1A',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  radioOptionActive: {
    backgroundColor: '#1F4E8C',
    borderColor: '#1F4E8C',
  },
  radioText: {
    fontSize: 13,
    color: '#8FA3BF',
  },
  radioTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#1F4E8C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#8FA3BF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonGroup: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModeButton: {
    backgroundColor: '#FF6B6B',
  },
  backButton: {
    backgroundColor: '#F4F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  backButtonText: {
    color: '#1F4E8C',
    fontSize: 15,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 40,
  },
  userListDelete: {
    flex: 1,
    marginBottom: 20,
    marginHorizontal: 0,
  },
  userListContentDelete: {
    paddingBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadge: {
    backgroundColor: '#E8F0FA',
  },
  workerBadge: {
    backgroundColor: '#F4F7FB',
  },
  userTypeText: {
    fontSize: 10,
    color: '#1F4E8C',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8FA3BF',
    fontSize: 14,
    marginTop: 40,
  },
  logoSmall: {
    width: 200,
    height: 200,
  },
  logoSmallDel: {
    width: 200,
    height: 200,
    marginTop: 20,
  },
  deleteContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCardDelete: {
    backgroundColor: '#F4F7FB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 0,
  },
  backButtonDelete: {
    backgroundColor: '#F4F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 0,
    marginBottom: 20,
  },
});

export default AuthScreen;