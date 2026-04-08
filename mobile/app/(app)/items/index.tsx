import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { colors } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import client from '@/src/api/client';

import { useRouter, useFocusEffect } from 'expo-router';

interface Item {
  id: string;
  name: string;
  sku: string | null;
  unit_of_measure: string | null;
  current_quantity: number;
  minimum_quantity: number;
  status: string;
  barcode: string | null;
}

export default function ItemsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  async function loadItems() {
    try {
      const res = await client.get('/api/items');
      setItems(res.data);
    } catch (error) {
      console.error('Failed to load items', error);
      Alert.alert('Error', 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
             setDeletingId(id);
             try {
               await client.delete(`/api/items/${id}`);
               setItems((prev) => prev.filter((i) => i.id !== id));
             } catch (error) {
               console.error(error);
               Alert.alert("Error", "Failed to delete item.");
             } finally {
               setDeletingId(null);
             }
          }
        }
      ]
    );
  }

  const renderItem = ({ item }: { item: Item }) => {
    const isLowStock = item.current_quantity <= item.minimum_quantity;
    
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: item.status === 'active' ? '#d1fae5' : '#f3f4f6' }]}>
            <Text style={[styles.badgeText, { color: item.status === 'active' ? '#065f46' : '#6b7280' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SKU:</Text>
            <Text style={styles.detailValue}>{item.sku || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={[styles.detailValue, isLowStock && styles.lowStock]}>
              {item.current_quantity} {item.unit_of_measure}
            </Text>
          </View>
        </View>

        <View style={styles.itemActions}>
          <Button 
            title="Edit" 
            variant="secondary" 
            style={styles.actionBtn}
            onPress={() => router.push(`/items/${item.id}/edit`)} 
          />
          <Button 
            title={deletingId === item.id ? "..." : "Delete"} 
            variant="secondary" 
            style={[styles.actionBtn, styles.deleteBtn]}
            disabled={deletingId === item.id}
            onPress={() => handleDelete(item.id, item.name)} 
          />
        </View>
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
      <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', gap: 12 }}>
        <Button 
          title="Import CSV" 
          variant="secondary" 
          style={{ flex: 1 }}
          onPress={() => router.push('/items/import')} 
        />
        <Button 
          title="+ New Item" 
          style={{ flex: 1 }} 
          onPress={() => router.push('/items/new')} 
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items found. Create your first item.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  itemCard: {
    padding: 16,
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  lowStock: {
    color: colors.danger,
    fontWeight: '700',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
  },
  deleteBtn: {
    borderColor: colors.danger,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 32,
    fontStyle: 'italic',
  }
});
