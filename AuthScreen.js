import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import React, { useState } from 'react';
import { db } from './config';
import { ref, get, set, child } from 'firebase/database';

const AuthScreen = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('worker');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    const userRef = ref(db, `users/${username}`);
    
    if (isLogin) {
      // Авторизация
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.password === password) {
            onAuthSuccess({ 
              username, 
              userType: userData.userType 
            });
          } else {
            Alert.alert('Ошибка', 'Неверный пароль');
          }
        } else {
          Alert.alert('Ошибка', 'Пользователь не найден');
        }
      });
    } else {
      // Регистрация
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          Alert.alert('Ошибка', 'Пользователь уже существует');
        } else {
          set(userRef, {
            username,
            password, // Внимание: пароль хранится в открытом виде!
            userType
          }).then(() => {
            onAuthSuccess({ username, userType });
          });
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {isLogin ? 'Вход' : 'Регистрация'}
      </Text>
      
      <TextInput
        placeholder="Логин"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      
      {!isLogin && (
        <View style={styles.radioContainer}>
          <Text>Тип пользователя:</Text>
          <View style={styles.radioButton}>
            <Button
              title="Админ"
              onPress={() => setUserType('admin')}
              color={userType === 'admin' ? '#007AFF' : '#CCCCCC'}
            />
          </View>
          <View style={styles.radioButton}>
            <Button
              title="Работник"
              onPress={() => setUserType('worker')}
              color={userType === 'worker' ? '#007AFF' : '#CCCCCC'}
            />
          </View>
        </View>
      )}
      
      <Button
        title={isLogin ? 'Войти' : 'Зарегистрироваться'}
        onPress={handleAuth}
      />
      
      <Button
        title={isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        onPress={() => setIsLogin(!isLogin)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  radioContainer: {
    marginBottom: 15,
  },
  radioButton: {
    marginVertical: 5,
  },
});

export default AuthScreen;