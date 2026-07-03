import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import Spinner from '../../src/components/ui/Spinner';
import { View } from 'react-native';
import { COLORS } from '../../src/theme';
import { Network, Archive, GitBranch, Map as MapIcon, Bell, User } from 'lucide-react-native';

export default function TabsLayout() {
  const { token, initializing } = useAuth();

  if (initializing) return <Spinner fullScreen />;
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="graph"
        options={{
          title: 'Graph',
          headerTitle: 'Knowledge Graph',
          tabBarIcon: ({ color, size }) => <Network color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="concepts"
        options={{
          title: 'Archives',
          headerTitle: 'Archives',
          tabBarIcon: ({ color, size }) => <Archive color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="clusters"
        options={{
          title: 'Clusters',
          headerTitle: 'Study Branches',
          tabBarIcon: ({ color, size }) => <GitBranch color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="learning-path"
        options={{
          title: 'Path',
          headerTitle: 'Learning Path',
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          headerTitle: 'Notifications',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
