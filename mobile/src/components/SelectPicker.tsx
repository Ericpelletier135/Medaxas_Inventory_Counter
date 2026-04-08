import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { colors, radius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectPickerProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function SelectPicker({
  label,
  value,
  options,
  onChange,
  placeholder = '— Select —',
  error,
  required,
}: SelectPickerProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, !selectedLabel && styles.placeholder]}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={visible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>

          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item.value === value && styles.optionSelected]}
                onPress={() => {
                  onChange(item.value);
                  setVisible(false);
                }}
              >
                <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>
                  {item.label}
                </Text>
                {item.value === value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  required: { color: colors.danger },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: radius.md,
  },
  triggerError: { borderColor: colors.danger },
  triggerText: { fontSize: 16, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textSecondary },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: { backgroundColor: '#EFF6FF' },
  optionText: { fontSize: 16, color: colors.textPrimary },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
});
