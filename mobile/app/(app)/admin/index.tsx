import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { colors, radius } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import client from '@/src/api/client';
import { useRouter, useFocusEffect } from 'expo-router';

type UserRecord = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  status: string;
};

export default function UserManagementScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  async function loadUsers() {
    try {
      const res = await client.get('/api/admin/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to load users', error);
      Alert.alert('Error', 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }: { item: UserRecord }) => {
    const isAdmin = item.is_admin;
    const isActive = item.is_active;

    return (
      <Card style={styles.card}>
        <TouchableOpacity 
          onPress={() => router.push(`/admin/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>
                {`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'No Name'}
              </Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgeUser]}>
                <Text style={[styles.badgeText, isAdmin ? styles.textAdmin : styles.textUser]}>
                  {isAdmin ? 'ADMIN' : 'USER'}
                </Text>
              </View>
              <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, isActive ? styles.textActive : styles.textInactive]}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
          </View>

          <Button 
            title="Edit User" 
            variant="secondary" 
            onPress={() => router.push(`/admin/${item.id}`)}
            style={{ marginTop: 12 }}
          />
        </TouchableOpacity>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Users Found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, flexGrow: 1 },
  card: { marginBottom: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  userEmail: { fontSize: 13, color: colors.textSecondary },
  badgeContainer: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeAdmin: { backgroundColor: '#dbeafe' },
  badgeUser: { backgroundColor: '#f3f4f6' },
  badgeActive: { backgroundColor: '#d1fae5' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 9, fontWeight: 'bold' },
  textAdmin: { color: '#1e40af' },
  textUser: { color: '#4b5563' },
  textActive: { color: '#065f46' },
  textInactive: { color: '#991b1b' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 64 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textSecondary }
});
