import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { colors, radius } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import client from '@/src/api/client';
import { useRouter, useFocusEffect } from 'expo-router';

type Session = {
  stock_count_session_id: string;
  count_date: string;
  status: string;
  created_at: string;
  stock_count_lines: any[];
};

export default function StockCountsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  async function loadSessions() {
    try {
      const res = await client.get('/api/stock-count-sessions');
      setSessions(res.data);
    } catch (error) {
      console.error('Failed to load sessions', error);
      Alert.alert('Error', 'Failed to load stock count sessions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession() {
    setCreating(true);
    try {
      const res = await client.post('/api/stock-count-sessions', {
        count_date: new Date().toISOString().split('T')[0]
      });
      const data = res.data;
      router.push(`/stock-counts/${data.stock_count_session_id}`);
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || "Failed to create session.";
      Alert.alert("Error", detail);
    } finally {
      setCreating(false);
    }
  }

  const renderItem = ({ item }: { item: Session }) => {
    const getStatusStyle = (status: string) => {
      switch (status.toLowerCase()) {
        case 'completed': return { bg: styles.badgeCompleted, text: styles.textCompleted };
        case 'in_progress':
        case 'in progress':
          return { bg: styles.badgeInProgress, text: styles.textInProgress };
        case 'open':
        default:
          return { bg: styles.badgeOpen, text: styles.textOpen };
      }
    };

    const statusStyle = getStatusStyle(item.status);

    return (
      <Card style={styles.card}>
        <TouchableOpacity 
          onPress={() => router.push(`/stock-counts/${item.stock_count_session_id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>{item.count_date}</Text>
            <View style={[styles.badge, statusStyle.bg]}>
              <Text style={[styles.badgeText, statusStyle.text]}>
                {item.status.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.details}>
            <Text style={styles.detailText}>📦 {item.stock_count_lines.length} items to count</Text>
            <Text style={styles.detailText}>🕒 Created: {new Date(item.created_at).toLocaleDateString()}</Text>
          </View>

          <Button 
            title={item.status === 'completed' ? "View Results" : "Continue Counting"} 
            variant="secondary" 
            onPress={() => router.push(`/stock-counts/${item.stock_count_session_id}`)}
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
      <View style={styles.headerBlock}>
         <Button 
           title="+ New Count Session" 
           onPress={handleCreateSession} 
           isLoading={creating}
           disabled={creating}
         />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.stock_count_session_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Count Sessions</Text>
            <Text style={styles.emptyText}>Start a new physical inventory session to track your stock levels.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBlock: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  list: { padding: 16, flexGrow: 1 },
  card: { marginBottom: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeCompleted: { backgroundColor: '#d1fae5' },
  badgeInProgress: { backgroundColor: '#fef3c7' },
  badgeOpen: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  textCompleted: { color: '#065f46' },
  textInProgress: { color: '#92400e' },
  textOpen: { color: '#1e40af' },
  details: { marginBottom: 16, gap: 6 },
  detailText: { color: colors.textSecondary, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 64 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingHorizontal: 32, lineHeight: 22 }
});
