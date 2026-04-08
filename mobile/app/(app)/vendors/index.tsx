import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { colors, radius } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import client from '@/src/api/client';
import { useRouter, useFocusEffect } from 'expo-router';

type VendorStatus = "all" | "active" | "inactive";

type Vendor = {
  vendor_id: string;
  vendor_name: string;
  contact_name: string | null;
  email: string | null;
  phone_number: string | null;
  status: string;
};

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorStatus>('all');

  useFocusEffect(
    useCallback(() => {
      loadVendors();
    }, [])
  );

  async function loadVendors() {
    try {
      const res = await client.get('/api/vendors');
      setVendors(res.data);
    } catch (error) {
      console.error('Failed to load vendors', error);
      Alert.alert('Error', 'Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const renderItem = ({ item }: { item: Vendor }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.vendor_name}</Text>
        <View style={[styles.badge, item.status === 'inactive' ? styles.badgeInactive : styles.badgeActive]}>
          <Text style={[styles.badgeText, item.status === 'inactive' ? styles.textInactive : styles.textActive]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>👤 {item.contact_name || 'No Contact'}</Text>
        <Text style={styles.detailText}>✉️ {item.email || 'No Email'}</Text>
        <Text style={styles.detailText}>📞 {item.phone_number || 'No Phone'}</Text>
      </View>

      <Button
        title="Edit Vendor"
        variant="secondary"
        onPress={() => {
          const id = item.vendor_id || (item as any).id;
          if (id) {
            router.push(`/vendors/${id}/edit`);
          } else {
            console.error('Vendor ID missing', item);
            Alert.alert('Error', 'Vendor ID missing.');
          }
        }}
      />
    </Card>
  );

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
          title="+ New Vendor" 
          onPress={() => router.push('/vendors/new')} 
          style={{ marginBottom: 16 }} 
        />

        <View style={styles.filterRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendor name or contact..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {/* Extremely simple native Segmented Control substitute for status dropdown */}
          <View style={styles.toggleGroup}>
            {(['all', 'active', 'inactive'] as VendorStatus[]).map(s => (
              <Text
                key={s}
                onPress={() => setStatusFilter(s)}
                style={[styles.toggleBtn, statusFilter === s && styles.toggleActive]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <FlatList
        data={filteredVendors}
        keyExtractor={(item) => item.vendor_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No vendors found matching your criteria.</Text>
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
  filterRow: {
    gap: 12,
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: radius.md,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontWeight: 'bold',
  },
  list: { padding: 16 },
  card: { marginBottom: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '600', color: colors.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#d1fae5' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  textActive: { color: '#065f46' },
  textInactive: { color: '#991b1b' },
  details: { marginBottom: 16, gap: 6 },
  detailText: { color: colors.textSecondary, fontSize: 14 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 32, fontStyle: 'italic' }
});
