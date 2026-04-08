import { Stack, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

export default function SalesOrdersLayout() {
  const navigation = useNavigation();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Sales Orders',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ marginLeft: 0, marginRight: 16 }}>
              <Ionicons name="menu" size={28} color={colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      <Stack.Screen name="[id]" options={{ title: 'Order Details', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
