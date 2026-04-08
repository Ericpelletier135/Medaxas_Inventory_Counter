import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { SelectPicker } from '../../../src/components/SelectPicker';
import { colors, radius } from '../../../src/theme/colors';
import client from '../../../src/api/client';

const UNIT_OPTIONS = [
  { value: 'ea', label: 'Each (ea)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'L', label: 'Litre (L)' },
  { value: 'mL', label: 'Millilitre (mL)' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

type Vendor = { vendor_id: string; vendor_name: string };

type FormErrors = Partial<Record<string, string>>;

export default function NewItemScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit_of_measure: '',
    current_quantity: '0',
    minimum_quantity: '0',
    reorder_quantity: '0',
    barcode: '',
    no_barcode: false,
    status: 'active',
    vendor_id: '',
  });

  useEffect(() => {
    client.get('/api/vendors')
      .then(res => setVendors(res.data))
      .catch(() => {}); // non-fatal
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Item name is required.';
    }
    if (!form.no_barcode && !form.barcode.trim()) {
      newErrors.barcode = "Enter a barcode, or tick 'This item has no barcode'.";
    }
    const currQty = parseInt(form.current_quantity);
    const minQty = parseInt(form.minimum_quantity);
    const reorderQty = parseInt(form.reorder_quantity);
    if (isNaN(currQty) || currQty < 0) {
      newErrors.current_quantity = 'Current quantity must be 0 or more.';
    }
    if (isNaN(minQty) || minQty < 0) {
      newErrors.minimum_quantity = 'Minimum quantity must be 0 or more.';
    }
    if (isNaN(reorderQty) || reorderQty < 0) {
      newErrors.reorder_quantity = 'Reorder quantity must be 0 or more.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        unit_of_measure: form.unit_of_measure || null,
        barcode: form.no_barcode ? '' : form.barcode.trim(),
        current_quantity: parseInt(form.current_quantity) || 0,
        minimum_quantity: parseInt(form.minimum_quantity) || 0,
        reorder_quantity: parseInt(form.reorder_quantity) || 0,
        status: form.status,
        vendor_id: form.vendor_id || null,
      };

      await client.post('/api/items', payload);
      router.back();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === 'SKU_ALREADY_EXISTS') {
        setErrors(prev => ({ ...prev, sku: 'An item with this SKU already exists.' }));
      } else {
        Alert.alert('Error', detail || 'Failed to create item.');
      }
    } finally {
      setSaving(false);
    }
  };

  const vendorOptions = [
    { value: '', label: '— No vendor —' },
    ...vendors.map(v => ({ value: v.vendor_id, label: v.vendor_name })),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Item Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="e.g. Nitrile Exam Gloves"
              placeholderTextColor={colors.textSecondary}
              value={form.name}
              onChangeText={(t) => setField('name', t)}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* SKU */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={[styles.input, errors.sku ? styles.inputError : null]}
              placeholder="e.g. GLV-NTR-L-100"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              value={form.sku}
              onChangeText={(t) => setField('sku', t)}
            />
            {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
          </View>

          {/* Unit of Measure — select from predefined list */}
          <SelectPicker
            label="Unit of Measure"
            value={form.unit_of_measure}
            options={UNIT_OPTIONS}
            onChange={(v) => setField('unit_of_measure', v)}
            placeholder="— Select unit —"
          />

          {/* Status — select */}
          <SelectPicker
            label="Status"
            value={form.status}
            options={STATUS_OPTIONS}
            onChange={(v) => setField('status', v)}
          />

          {/* Quantity row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Current Qty</Text>
              <TextInput
                style={[styles.input, errors.current_quantity ? styles.inputError : null]}
                keyboardType="numeric"
                value={form.current_quantity}
                onChangeText={(t) => setField('current_quantity', t)}
              />
              {errors.current_quantity && <Text style={styles.errorText}>{errors.current_quantity}</Text>}
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Min Qty</Text>
              <TextInput
                style={[styles.input, errors.minimum_quantity ? styles.inputError : null]}
                keyboardType="numeric"
                value={form.minimum_quantity}
                onChangeText={(t) => setField('minimum_quantity', t)}
              />
              {errors.minimum_quantity && <Text style={styles.errorText}>{errors.minimum_quantity}</Text>}
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Reorder Qty</Text>
              <TextInput
                style={[styles.input, errors.reorder_quantity ? styles.inputError : null]}
                keyboardType="numeric"
                value={form.reorder_quantity}
                onChangeText={(t) => setField('reorder_quantity', t)}
              />
              {errors.reorder_quantity && <Text style={styles.errorText}>{errors.reorder_quantity}</Text>}
            </View>
          </View>

          {/* Vendor — select */}
          <SelectPicker
            label="Vendor"
            value={form.vendor_id}
            options={vendorOptions}
            onChange={(v) => setField('vendor_id', v)}
            placeholder="— No vendor —"
          />

          {/* Barcode */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={[styles.input, errors.barcode ? styles.inputError : null, form.no_barcode && styles.inputDisabled]}
              placeholder="Scan or type barcode"
              placeholderTextColor={colors.textSecondary}
              value={form.barcode}
              editable={!form.no_barcode}
              onChangeText={(t) => setField('barcode', t)}
            />
            {errors.barcode && <Text style={styles.errorText}>{errors.barcode}</Text>}

            <View style={styles.switchRow}>
              <Switch
                value={form.no_barcode}
                onValueChange={(v) => {
                  setField('no_barcode', v);
                  if (v) setField('barcode', '');
                  if (errors.barcode) setErrors(prev => ({ ...prev, barcode: undefined }));
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
              <Text style={styles.switchLabel}>This item has no barcode</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              style={styles.actionBtn}
              onPress={() => router.back()}
              disabled={saving}
            />
            <Button
              title={saving ? 'Saving…' : 'Create Item'}
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
  scroll: { padding: 16, paddingBottom: 40 },
  card: { padding: 16 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  required: { color: colors.danger },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger },
  inputDisabled: { opacity: 0.45, backgroundColor: '#F3F4F6' },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  switchLabel: { fontSize: 14, color: colors.textSecondary },
  actions: { flexDirection: 'row', marginTop: 8, gap: 12 },
  actionBtn: { flex: 1 },
});
