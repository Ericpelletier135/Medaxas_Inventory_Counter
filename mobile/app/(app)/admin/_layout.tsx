import { Stack, useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

export default function AdminLayout() {
  const router = useRouter();
  const navigation = useNavigation();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'User Management',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ marginLeft: 0, marginRight: 16 }}>
              <Ionicons name="menu" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/admin/new')} style={{ marginRight: 8 }}>
              <Ionicons name="person-add-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      <Stack.Screen name="new" options={{ title: 'Create User', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'User Command Center', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
