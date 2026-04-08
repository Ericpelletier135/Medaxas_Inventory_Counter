import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { colors, radius } from '@/src/theme/colors';
import { Button } from '@/src/components/Button';
import { SelectPicker } from '@/src/components/SelectPicker';
import client from '@/src/api/client';
import { useRouter } from 'expo-router';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

type FormErrors = Partial<Record<string, string>>;

export default function NewVendorScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState({
    vendor_name: '',
    contact_name: '',
    email: '',
    phone_number: '',
    address: '',
    status: 'active',
  });

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!form.vendor_name.trim()) {
      newErrors.vendor_name = 'Vendor name is required.';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (form.phone_number.trim() && !/^[\d\s()+-]{7,20}$/.test(form.phone_number.trim())) {
      newErrors.phone_number = 'Please enter a valid phone number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;

    try {
      setSubmitting(true);
      await client.post('/api/vendors', {
        vendor_name: form.vendor_name.trim(),
        contact_name: form.contact_name.trim() || null,
        email: form.email.trim() || null,
        phone_number: form.phone_number.trim() || null,
        address: form.address.trim() || null,
        status: form.status,
      });
      router.back();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      Alert.alert('Error', detail || 'Failed to create vendor.');
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>

        {/* Vendor Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Vendor Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.vendor_name ? styles.inputError : null]}
            placeholder="e.g. Acme Corp"
            placeholderTextColor={colors.textSecondary}
            value={form.vendor_name}
            onChangeText={(v) => setField('vendor_name', v)}
          />
          {errors.vendor_name && <Text style={styles.errorText}>{errors.vendor_name}</Text>}
        </View>

        {/* Contact Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jane Doe"
            placeholderTextColor={colors.textSecondary}
            value={form.contact_name}
            onChangeText={(v) => setField('contact_name', v)}
          />
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="e.g. jane@acme.com"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textSecondary}
            value={form.email}
            onChangeText={(v) => setField('email', v)}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, errors.phone_number ? styles.inputError : null]}
            placeholder="e.g. (555) 123-4567"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textSecondary}
            value={form.phone_number}
            onChangeText={(v) => setField('phone_number', v)}
          />
          {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number}</Text>}
        </View>

        {/* Address */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="e.g. 123 Business Rd"
            multiline
            placeholderTextColor={colors.textSecondary}
            value={form.address}
            onChangeText={(v) => setField('address', v)}
          />
        </View>

        {/* Status — select picker */}
        <SelectPicker
          label="Status"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(v) => setField('status', v)}
        />

        <View style={styles.actions}>
          <Button title="Cancel" variant="secondary" style={styles.actionBtn} onPress={() => router.back()} disabled={submitting} />
          <Button title={submitting ? 'Saving…' : 'Save Vendor'} style={styles.actionBtn} onPress={handleCreate} isLoading={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
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
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
});
