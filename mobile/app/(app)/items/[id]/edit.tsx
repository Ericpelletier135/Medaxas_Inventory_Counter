import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input } from '../../../../src/components/Input';
import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { colors } from '../../../../src/theme/colors';
import client from '../../../../src/api/client';

export default function EditItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit_of_measure: '',
    minimum_quantity: '0',
    current_quantity: '0',
    barcode: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Basic fetch assuming /api/items/{id} returns the item
    client.get(`/api/items/${id}`)
      .then(res => {
        const item = res.data;
        setForm({
          name: item.name || '',
          sku: item.sku || '',
          unit_of_measure: item.unit_of_measure || '',
          minimum_quantity: item.minimum_quantity?.toString() || '0',
          current_quantity: item.current_quantity?.toString() || '0',
          barcode: item.barcode || '',
          status: item.status || 'active'
        });
      })
      .catch(err => {
        Alert.alert('Error', 'Failed to load item details.');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        sku: form.sku.trim() || null,
        unit_of_measure: form.unit_of_measure.trim() || null,
        barcode: form.barcode.trim() || null,
        minimum_quantity: parseInt(form.minimum_quantity) || 0,
        current_quantity: parseInt(form.current_quantity) || 0,
      };

      await client.patch(`/api/items/${id}`, payload);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update item.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return (
       <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <ActivityIndicator size="large" color={colors.primary} />
       </View>
     );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Input 
            label="Name *"
            value={form.name}
            onChangeText={(t) => setForm(prev => ({ ...prev, name: t }))}
          />
          <Input 
            label="SKU"
            value={form.sku}
            onChangeText={(t) => setForm(prev => ({ ...prev, sku: t }))}
          />
          <Input 
            label="Unit of Measure"
            value={form.unit_of_measure}
            onChangeText={(t) => setForm(prev => ({ ...prev, unit_of_measure: t }))}
          />
          <View style={styles.row}>
            <Input 
              label="Current Qty"
              style={styles.halfInput}
              keyboardType="numeric"
              value={form.current_quantity}
              onChangeText={(t) => setForm(prev => ({ ...prev, current_quantity: t }))}
            />
            <Input 
              label="Min Qty"
              style={styles.halfInput}
              keyboardType="numeric"
              value={form.minimum_quantity}
              onChangeText={(t) => setForm(prev => ({ ...prev, minimum_quantity: t }))}
            />
          </View>
          <Input 
            label="Barcode"
            value={form.barcode}
            onChangeText={(t) => setForm(prev => ({ ...prev, barcode: t }))}
          />

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              style={styles.actionBtn}
              onPress={() => router.back()}
              disabled={saving}
            />
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              style={styles.actionBtn}
              onPress={handleSubmit}
              isLoading={saving}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  card: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  halfInput: { flex: 1 },
  actions: { flexDirection: 'row', marginTop: 16, gap: 12 },
  actionBtn: { flex: 1 }
});
