import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../src/theme/colors';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const isAdminStr = await SecureStore.getItemAsync('is_admin');
      
      if (!token) {
        router.replace('/login');
        return;
      }

      const isAdmin = isAdminStr === 'true';
      
      if (isAdmin) {
        router.replace('/(app)/admin');
      } else {
        router.replace('/(app)/dashboard');
      }
    } catch (e) {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
