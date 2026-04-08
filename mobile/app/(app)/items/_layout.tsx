import { Stack, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';

export default function ItemsLayout() {
  const navigation = useNavigation();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Item Catalogue',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ marginLeft: 0, marginRight: 16 }}>
              <Ionicons name="menu" size={28} color={colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      <Stack.Screen name="new" options={{ title: 'Create New Item', headerBackTitle: 'Back' }} />
      <Stack.Screen name="import" options={{ title: 'Import from CSV', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Item', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
