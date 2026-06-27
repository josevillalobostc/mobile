import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#0f1117" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0f1117' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#0f1117' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="concept/[id]"
            options={{ title: 'Concept Detail', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="flashcards"
            options={{ title: 'Study Session', headerBackTitle: 'Back' }}
          />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
