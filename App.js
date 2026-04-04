import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import AuthScreen from './AuthScreen';
import TasksManager from './TasksManager';

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <View style={styles.container}>
      {user ? (
        <TasksManager user={user} onSignOut={() => setUser(null)} />
      ) : (
        <AuthScreen onAuthSuccess={setUser} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});