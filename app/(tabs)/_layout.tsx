import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import Spinner from '../../src/components/ui/Spinner';
import { Text } from 'react-native';
import { COLORS } from '../../src/theme';

function TabIcon({ label, icon, focused }: { label: string; icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

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
          headerTitle: '✦ Knowledge Graph',
          tabBarIcon: ({ focused }) => <TabIcon label="Graph" icon="🕸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="concepts"
        options={{
          title: 'Archives',
          headerTitle: '📦 Archives',
          tabBarIcon: ({ focused }) => <TabIcon label="Archives" icon="📦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clusters"
        options={{
          title: 'Clusters',
          headerTitle: '🌿 Study Branches',
          tabBarIcon: ({ focused }) => <TabIcon label="Clusters" icon="🌿" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learning-path"
        options={{
          title: 'Path',
          headerTitle: '🗺 Learning Path',
          tabBarIcon: ({ focused }) => <TabIcon label="Path" icon="🗺" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          headerTitle: '🔔 Notifications',
          tabBarIcon: ({ focused }) => <TabIcon label="Alerts" icon="🔔" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: '👤 Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
