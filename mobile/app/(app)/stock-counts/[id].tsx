import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius } from '@/src/theme/colors';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import client from '@/src/api/client';

type ItemMinimal = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_of_measure: string | null;
};

type StockCountLine = {
  stock_count_line_id: string;
  item_id: string;
  previous_quantity: number;
  counted_quantity: number | null;
  variance: number | null;
  notes: string | null;
  item: ItemMinimal;
};

type StockCountSession = {
  stock_count_session_id: string;
  status: string;
  count_date: string;
  stock_count_lines: StockCountLine[];
};

export default function StockCountDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<StockCountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [localCounts, setLocalCounts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSession();
  }, [id]);

  async function loadSession() {
    try {
      const res = await client.get(`/api/stock-count-sessions/${id}`);
      const data = res.data;
      setSession(data);

      const initialCounts: Record<string, string> = {};
      data.stock_count_lines.forEach((line: StockCountLine) => {
        initialCounts[line.stock_count_line_id] = line.counted_quantity !== null ? String(line.counted_quantity) : "";
      });
      setLocalCounts(initialCounts);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load session details.");
    } finally {
      setLoading(false);
    }
  }

  const handleCountChange = (lineId: string, value: string) => {
    // Only allow digits
    if (value !== "" && !/^\d+$/.test(value)) return;
    setLocalCounts((prev) => ({ ...prev, [lineId]: value }));
  };

  const handleBlurSave = async (lineId: string) => {
    if (!session) return;
    const value = localCounts[lineId];
    if (value === "") return;

    const numValue = parseInt(value, 10);

    // Optimistic UI update for variance
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stock_count_lines: prev.stock_count_lines.map(line =>
          line.stock_count_line_id === lineId
            ? { ...line, counted_quantity: numValue, variance: numValue - line.previous_quantity }
            : line
        )
      };
    });

    try {
      await client.patch(`/api/stock-count-sessions/${id}/lines/${lineId}`, {
        counted_quantity: numValue
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Save Failed", "Could not save the count for this item.");
    }
  };

  const handleComplete = async () => {
    Alert.alert(
      "Complete Session",
      "Are you sure? This will update the live inventory quantities based on your counts.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Complete", 
          onPress: async () => {
            setCompleting(true);
            try {
              const res = await client.post(`/api/stock-count-sessions/${id}/complete`);
              setSession(res.data);
              Alert.alert("Success", "Session completed successfully!");
            } catch (error: any) {
              console.error(error);
              const detail = error.response?.data?.detail || "Failed to complete session.";
              Alert.alert("Error", detail);
            } finally {
              setCompleting(false);
            }
          }
        }
      ]
    );
  };

  const handleGenerateOrders = async () => {
    setGenerating(true);
    try {
      const res = await client.post(`/api/sales-orders/generate/${id}`);
      if (res.data.length === 0) {
        Alert.alert("Status", "All items are above minimum stock levels. No orders needed.");
      } else {
        Alert.alert("Success", `Generated ${res.data.length} sales orders successfully.`);
        router.push("/sales-orders");
      }
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || "Failed to generate orders.";
      Alert.alert("Error", detail);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Session not found.</Text>
      </View>
    );
  }

  const totalLines = session.stock_count_lines.length;
  const completedLines = session.stock_count_lines.filter(l => l.counted_quantity !== null).length;
  const progressPercent = totalLines === 0 ? 100 : (completedLines / totalLines);
  const isCompleted = session.status === 'completed';
  const canComplete = completedLines === totalLines && !isCompleted && totalLines > 0;

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

  const renderLine = ({ item }: { item: StockCountLine }) => {
    const varianceValue = item.variance;
    let varianceColor = colors.textPrimary;
    if (varianceValue !== null) {
      if (varianceValue < 0) varianceColor = colors.danger;
      if (varianceValue > 0) varianceColor = '#065f46'; // success green
    }

    return (
      <Card style={styles.lineCard}>
        <View style={styles.lineHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.item.name}</Text>
            <Text style={styles.itemSku}>{item.item.sku || 'No SKU'}</Text>
          </View>
          <View style={styles.varianceBox}>
            <Text style={styles.varianceLabel}>Var.</Text>
            <Text style={[styles.varianceValue, { color: varianceColor }]}>
              {varianceValue !== null ? (varianceValue > 0 ? `+${varianceValue}` : varianceValue) : "-"}
            </Text>
          </View>
        </View>

        <View style={styles.countRow}>
          <View style={styles.qtyBox}>
            <Text style={styles.qtyLabel}>System Qty</Text>
            <Text style={styles.qtyValue}>{item.previous_quantity}</Text>
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.qtyLabel}>Physical Count</Text>
            <TextInput 
              style={[styles.input, isCompleted && styles.disabledInput]}
              value={localCounts[item.stock_count_line_id]}
              onChangeText={(v) => handleCountChange(item.stock_count_line_id, v)}
              onBlur={() => handleBlurSave(item.stock_count_line_id)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              editable={!isCompleted}
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <View style={styles.progressSection}>
          <View style={styles.progressTextRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.progressTitle}>Progress</Text>
              <View style={[styles.badge, getStatusStyle(session.status).bg]}>
                <Text style={[styles.badgeText, getStatusStyle(session.status).text]}>
                  {session.status.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.progressValue}>{completedLines} / {totalLines} items</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progressPercent * 100}%` },
                progressPercent === 1 && { backgroundColor: '#059669' }
              ]} 
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          {!isCompleted ? (
            <Button 
              title={completing ? "Completing..." : "Complete Session"} 
              onPress={handleComplete}
              disabled={!canComplete || completing}
              isLoading={completing}
              style={[styles.actionBtn, canComplete && { backgroundColor: '#059669' }]}
            />
          ) : (
            <Button 
              title={generating ? "Generating..." : "Generate Sales Orders"} 
              onPress={handleGenerateOrders}
              isLoading={generating}
              disabled={generating}
              style={styles.actionBtn}
            />
          )}
        </View>
      </View>

      <FlatList
        data={session.stock_count_lines}
        keyExtractor={(item) => item.stock_count_line_id}
        renderItem={renderLine}
        contentContainerStyle={styles.list}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressSection: { marginBottom: 16 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTitle: { fontWeight: '600', color: colors.textPrimary },
  progressValue: { color: colors.textSecondary, fontSize: 12 },
  progressBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary },
  actionRow: { flexDirection: 'row' },
  actionBtn: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  lineCard: { padding: 16, marginBottom: 16 },
  lineHeader: { flexDirection: 'row', marginBottom: 16 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  itemSku: { fontSize: 12, color: colors.textSecondary },
  varianceBox: { alignItems: 'flex-end', marginLeft: 16 },
  varianceLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 2 },
  varianceValue: { fontSize: 16, fontWeight: 'bold' },
  countRow: { flexDirection: 'row', gap: 16 },
  qtyBox: { flex: 1 },
  inputBox: { flex: 1 },
  qtyLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  qtyValue: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    borderRadius: radius.md,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: colors.textSecondary,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeCompleted: { backgroundColor: '#d1fae5' },
  badgeInProgress: { backgroundColor: '#fef3c7' },
  badgeOpen: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  textCompleted: { color: '#065f46' },
  textInProgress: { color: '#92400e' },
  textOpen: { color: '#1e40af' },
});
