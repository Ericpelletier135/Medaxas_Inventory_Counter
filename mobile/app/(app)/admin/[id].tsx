import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Switch, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius } from '@/src/theme/colors';
import { Input } from '@/src/components/Input';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import client from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';

type UserDataResponse = {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    is_active: boolean;
    status: string;
  };
  items: any[];
  vendors: any[];
  stock_count_sessions: any[];
  sales_orders: any[];
};

export default function UserCommandCenter() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [data, setData] = useState<UserDataResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  // Form states for settings tab
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const res = await client.get(`/api/admin/users/${id}/data`);
      const fullData = res.data;
      setData(fullData);
      
      // Seed form states
      setEmail(fullData.user.email);
      setFirstName(fullData.user.first_name || '');
      setLastName(fullData.user.last_name || '');
      setIsAdmin(fullData.user.is_admin);
      setIsActive(fullData.user.is_active);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load user information.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        email,
        first_name: firstName,
        last_name: lastName,
        is_admin: isAdmin,
        is_active: isActive,
        status: isActive ? 'active' : 'inactive'
      };
      if (password) payload.password = password;

      await client.patch(`/api/admin/users/${id}`, payload);
      Alert.alert('Success', 'User profile updated.');
      loadData(); // Refresh overview
      setActiveTab('overview');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete User',
      'Permanently delete this user? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await client.delete(`/api/admin/users/${id}`);
              Alert.alert('Success', 'User deleted.');
              router.replace('/admin');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete user.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  }

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName = `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() || data.user.email;

  const SummaryCard = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name={icon as any} size={20} color={colors.textSecondary} />
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{displayName}</Text>
          <Text style={styles.headerSubtitle}>{data.user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, data.user.is_admin ? styles.badgeAdmin : styles.badgeUser]}>
              <Text style={[styles.badgeText, data.user.is_admin ? styles.textAdmin : styles.textUser]}>
                {data.user.is_admin ? 'ADMIN' : 'USER'}
              </Text>
            </View>
            <View style={[styles.badge, data.user.is_active ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, data.user.is_active ? styles.textActive : styles.textInactive]}>
                {data.user.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]} 
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Profile & Security</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'overview' ? (
          <View>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <SummaryCard label="Items" value={data.items.length} icon="cube-outline" />
              <SummaryCard label="Vendors" value={data.vendors.length} icon="business-outline" />
              <SummaryCard label="Counts" value={data.stock_count_sessions.length} icon="checkmark-circle-outline" />
              <SummaryCard label="Orders" value={data.sales_orders.length} icon="cart-outline" />
            </View>

            {/* Resource Sections */}
            <Section title="Recent Items" count={data.items.length}>
              {data.items.slice(0, 5).map((item, idx) => (
                <ResourceItem key={idx} title={item.name} subtitle={item.sku || 'No SKU'} right={`Qty: ${item.current_quantity}`} />
              ))}
            </Section>

            <Section title="Recent Vendors" count={data.vendors.length}>
              {data.vendors.slice(0, 5).map((v, idx) => (
                <ResourceItem key={idx} title={v.vendor_name} subtitle={v.email || 'No email'} right={v.status} />
              ))}
            </Section>

            <Section title="Recent Activity" count={data.stock_count_sessions.length + data.sales_orders.length}>
               {data.stock_count_sessions.slice(0, 3).map((s, idx) => (
                  <ResourceItem key={`s-${idx}`} title="Stock Count" subtitle={s.status} right={new Date(s.created_at).toLocaleDateString()} />
               ))}
               {data.sales_orders.slice(0, 3).map((o, idx) => (
                  <ResourceItem key={`o-${idx}`} title={`Order #${o.order_number}`} subtitle={o.status} right={new Date(o.order_date).toLocaleDateString()} />
               ))}
            </Section>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Card style={{ padding: 16 }}>
              <Input label="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input label="First Name" value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Input label="Last Name" value={lastName} onChangeText={setLastName} />
                </View>
              </View>
              <Input label="Reset Password" placeholder="Keep blank to remain unchanged" value={password} onChangeText={setPassword} secureTextEntry />

              <View style={styles.switchBox}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Administrator Access</Text>
                  <Switch value={isAdmin} onValueChange={setIsAdmin} trackColor={{ false: '#d1d5db', true: '#93c5fd' }} thumbColor={isAdmin ? colors.primary : '#f4f3f4'} />
                </View>
                <View style={[styles.switchRow, { marginTop: 12 }]}>
                  <Text style={styles.switchLabel}>Account Status (Active)</Text>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#d1d5db', true: '#6ee7b7' }} thumbColor={isActive ? '#10b981' : '#f4f3f4'} />
                </View>
              </View>

              <Button title={saving ? "Saving..." : "Save Profile"} onPress={handleSave} isLoading={saving} disabled={saving || deleting} style={{ marginTop: 24 }} />
              <Button title="Delete User" variant="secondary" onPress={handleDelete} isLoading={deleting} disabled={saving || deleting} style={{ marginTop: 12, borderColor: colors.danger }} textStyle={{ color: colors.danger }} />
            </Card>
          </KeyboardAvoidingView>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCount}><Text style={styles.sectionCountText}>{count}</Text></View>
      </View>
      <Card style={{ padding: 4 }}>
        {children}
        {count === 0 && <Text style={styles.emptyText}>No records found.</Text>}
      </Card>
    </View>
  );
}

function ResourceItem({ title, subtitle, right }: { title: string; subtitle: string; right: string }) {
  return (
    <View style={styles.resourceItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.resourceTitle}>{title}</Text>
        <Text style={styles.resourceSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.resourceRight}>{right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeAdmin: { backgroundColor: '#dbeafe' },
  badgeUser: { backgroundColor: '#f3f4f6' },
  badgeActive: { backgroundColor: '#d1fae5' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  textAdmin: { color: '#1e40af' },
  textUser: { color: '#4b5563' },
  textActive: { color: '#065f46' },
  textInactive: { color: '#991b1b' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: colors.primary },
  scroll: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, minWidth: '45%', padding: 12, alignItems: 'center' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: colors.textSecondary },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  sectionCount: { backgroundColor: '#e5e7eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  sectionCountText: { fontSize: 10, fontWeight: 'bold', color: '#4b5563' },
  resourceItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', alignItems: 'center' },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  resourceSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resourceRight: { fontSize: 12, fontWeight: '500', color: colors.primary },
  emptyText: { padding: 20, textAlign: 'center', color: colors.textSecondary, fontStyle: 'italic' },
  row: { flexDirection: 'row' },
  switchBox: { marginTop: 16, padding: 12, backgroundColor: '#f9fafb', borderRadius: radius.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
});
