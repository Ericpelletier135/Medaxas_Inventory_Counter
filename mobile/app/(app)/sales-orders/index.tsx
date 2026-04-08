import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { colors, radius } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import client from '@/src/api/client';
import { useRouter, useFocusEffect } from 'expo-router';

type SalesOrder = {
  sales_order_id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_items: number;
  created_at: string;
};

export default function SalesOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  async function loadOrders() {
    try {
      const res = await client.get('/api/sales-orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to load orders', error);
      Alert.alert('Error', 'Failed to load sales orders.');
    } finally {
      setLoading(false);
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return { bg: styles.badgeCompleted, text: styles.textCompleted };
      case 'ordered':
      case 'in_progress':
        return { bg: styles.badgeInProgress, text: styles.textInProgress };
      case 'draft':
      case 'open':
      default:
        return { bg: styles.badgeOpen, text: styles.textOpen };
    }
  };

  const renderItem = ({ item }: { item: SalesOrder }) => {
    const statusStyle = getStatusStyle(item.status);
    
    return (
      <Card style={styles.card}>
        <TouchableOpacity 
          onPress={() => router.push(`/sales-orders/${item.sales_order_id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.orderNumber}>{item.order_number}</Text>
              <Text style={styles.orderDate}>{item.order_date}</Text>
            </View>
            <View style={[styles.badge, statusStyle.bg]}>
              <Text style={[styles.badgeText, statusStyle.text]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.details}>
            <Text style={styles.detailText}>📦 {item.total_items} line items</Text>
          </View>

          <Button 
            title="View Details" 
            variant="secondary" 
            onPress={() => router.push(`/sales-orders/${item.sales_order_id}`)}
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
        data={orders}
        keyExtractor={(item) => item.sales_order_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Sales Orders</Text>
            <Text style={styles.emptyText}>Orders are automatically generated after completing a stock count session.</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 2 },
  orderDate: { fontSize: 12, color: colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeCompleted: { backgroundColor: '#d1fae5' },
  badgeInProgress: { backgroundColor: '#fef3c7' },
  badgeOpen: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  textCompleted: { color: '#065f46' },
  textInProgress: { color: '#92400e' },
  textOpen: { color: '#1e40af' },
  details: { marginBottom: 16 },
  detailText: { color: colors.textSecondary, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 64 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingHorizontal: 32, lineHeight: 22 }
});
