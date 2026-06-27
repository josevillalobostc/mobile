import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import Spinner from '../src/components/ui/Spinner';

export default function IndexPage() {
  const { token, initializing } = useAuth();

  if (initializing) return <Spinner fullScreen />;
  if (token) return <Redirect href="/(tabs)/graph" />;
  return <Redirect href="/login" />;
}
