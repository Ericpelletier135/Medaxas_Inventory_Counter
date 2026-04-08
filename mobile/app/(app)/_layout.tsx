import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Text, View, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

function CustomDrawerContent(props: any) {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('is_admin');
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <View style={{ padding: 20, paddingTop: 60, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.primary }}>Medaxas</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>by Divocco</Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 20, paddingBottom: 40 }}>
        <TouchableOpacity 
          onPress={handleLogout}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.danger }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    const adminStr = await SecureStore.getItemAsync('is_admin');
    setIsAdmin(adminStr === 'true');
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
      }}
    >
      <Drawer.Screen
        name="dashboard/index"
        options={{
          drawerLabel: 'Overview',
          title: 'Dashboard',
          drawerIcon: () => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Drawer.Screen
        name="vendors"
        options={{
          headerShown: false,
          drawerLabel: 'Vendors',
          title: 'Vendor Management',
          drawerIcon: () => <Text style={{ fontSize: 24 }}>🏢</Text>,
        }}
      />
      <Drawer.Screen
        name="items"
        options={{
          headerShown: false,
          drawerLabel: 'Items',
          title: 'Item Catalogue',
          drawerIcon: () => <Text style={{ fontSize: 24 }}>📦</Text>,
        }}
      />
      <Drawer.Screen
        name="stock-counts"
        options={{
          headerShown: false,
          drawerLabel: 'Stock Counts',
          title: 'Stock Sessions',
          drawerIcon: () => <Text style={{ fontSize: 24 }}>📋</Text>,
        }}
      />
      <Drawer.Screen
        name="sales-orders"
        options={{
          headerShown: false,
          drawerLabel: 'Sales Orders',
          title: 'Sales Orders',
          drawerIcon: () => <Text style={{ fontSize: 24 }}>🛒</Text>,
        }}
      />
      {isAdmin && (
        <Drawer.Screen
          name="admin"
          options={{
            headerShown: false,
            drawerLabel: 'Admin Portal',
            title: 'Admin Portal',
            drawerIcon: () => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          }}
        />
      )}
    </Drawer>
  );
}
