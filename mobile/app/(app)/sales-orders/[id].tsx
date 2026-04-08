import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import client from '@/src/api/client';

type SalesOrderLine = {
  sales_order_line_id: string;
  current_quantity: number;
  minimum_quantity: number;
  quantity_to_order: number;
  unit_of_measure: string | null;
  item: {
    name: string;
    sku: string | null;
  };
};

type SalesOrder = {
  sales_order_id: string;
  order_number: string;
  status: string;
  order_date: string;
  sales_order_lines: SalesOrderLine[];
};

export default function SalesOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      const res = await client.get(`/api/sales-orders/${id}`);
      setOrder(res.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load sales order details.");
    } finally {
      setLoading(false);
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger }}>Order not found.</Text>
      </View>
    );
  }

  const renderLine = ({ item }: { item: SalesOrderLine }) => (
    <Card style={styles.lineCard}>
      <View style={styles.lineHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.item.name}</Text>
          <Text style={styles.itemSku}>{item.item.sku || 'No SKU'}</Text>
        </View>
        <View style={styles.orderQtyBox}>
          <Text style={styles.qtyLabel}>Order Qty</Text>
          <Text style={styles.orderQtyValue}>{item.quantity_to_order}</Text>
          <Text style={styles.uomText}>{item.unit_of_measure || 'units'}</Text>
        </View>
      </View>

      <View style={styles.lineFooter}>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Current:</Text>
          <Text style={[styles.infoValue, { color: colors.danger }]}>{item.current_quantity}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Threshold:</Text>
          <Text style={styles.infoValue}>{item.minimum_quantity}</Text>
        </View>
      </View>
    </Card>
  );

  const statusStyle = getStatusStyle(order.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{order.order_number}</Text>
          <View style={[styles.badge, statusStyle.bg]}>
            <Text style={[styles.badgeText, statusStyle.text]}>
              {order.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Date: {order.order_date} | {order.sales_order_lines.length} items
        </Text>
      </View>

      <FlatList
        data={order.sales_order_lines}
        keyExtractor={(item) => item.sales_order_line_id}
        renderItem={renderLine}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeCompleted: { backgroundColor: '#d1fae5' },
  badgeInProgress: { backgroundColor: '#fef3c7' },
  badgeOpen: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  textCompleted: { color: '#065f46' },
  textInProgress: { color: '#92400e' },
  textOpen: { color: '#1e40af' },
  list: { padding: 16, paddingBottom: 32 },
  lineCard: { padding: 16, marginBottom: 16 },
  lineHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  itemSku: { fontSize: 12, color: colors.textSecondary },
  orderQtyBox: { alignItems: 'flex-end', marginLeft: 16 },
  qtyLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  orderQtyValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  uomText: { fontSize: 10, color: colors.textSecondary },
  lineFooter: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 12, color: colors.textSecondary },
  infoValue: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
});
