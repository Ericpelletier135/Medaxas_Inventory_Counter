import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { colors, radius } from '@/src/theme/colors';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import client from '@/src/api/client';

type ItemField =
  | "name"
  | "sku"
  | "unit_of_measure"
  | "current_quantity"
  | "minimum_quantity"
  | "reorder_quantity"
  | "status"
  | "vendor_id"
  | "barcode";

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function suggestedFieldForHeader(header: string): ItemField | "" {
  const n = normalizeHeader(header);
  if (["name", "item_name", "product_name"].includes(n)) return "name";
  if (["sku", "item_sku", "product_sku", "code"].includes(n)) return "sku";
  if (["unit", "unit_of_measure", "uom"].includes(n)) return "unit_of_measure";
  if (["qty", "quantity", "current_qty", "current_quantity", "on_hand"].includes(n)) {
    return "current_quantity";
  }
  if (["minimum_qty", "minimum_quantity", "min_qty", "min_quantity", "par_level"].includes(n)) {
    return "minimum_quantity";
  }
  if (["reorder_qty", "reorder_quantity", "order_qty"].includes(n)) return "reorder_quantity";
  if (["status", "active_status"].includes(n)) return "status";
  if (["vendor_id", "supplier_id"].includes(n)) return "vendor_id";
  if (["barcode", "bar_code", "upc", "ean"].includes(n)) return "barcode";
  return "";
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell);
      currentCell = "";
      const isNonEmptyRow = currentRow.some((cell) => cell.trim() !== "");
      if (isNonEmptyRow) rows.push(currentRow);
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) rows.push(currentRow);
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, index) => {
      record[h] = (row[index] ?? "").trim();
    });
    return record;
  });

  return { headers, rows: dataRows };
}

export default function ItemImportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values'],
      });

      if (result.canceled) return;

      setLoading(true);
      const file = result.assets[0];
      setFileName(file.name);

      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseCsv(content);

      if (parsed.headers.length === 0) {
        Alert.alert("Error", "Selected file is empty or invalid.");
        setFileName(null);
        return;
      }

      setCsvData(parsed);

      // Auto-map logic
      const suggested: Record<string, string> = {};
      for (const header of parsed.headers) {
        const field = suggestedFieldForHeader(header);
        if (field && !suggested[field]) {
          suggested[field] = header;
        }
      }
      setMapping(suggested);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to read CSV file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!csvData) return;

    if (!mapping["name"]) {
      Alert.alert("Validation Error", "The CSV must have a column mapped to 'Item Name'. We couldn't find one automatically.");
      return;
    }

    setImporting(true);
    try {
      const res = await client.post('/api/items/bulk-import', {
        rows: csvData.rows,
        mapping: mapping
      });

      const { created_count, skipped_count, errors } = res.data;
      
      let message = `Successfully created ${created_count} items.`;
      if (skipped_count > 0) {
        message += `\n${skipped_count} rows were skipped.`;
      }
      if (errors && errors.length > 0) {
        message += `\n\nFirst error: ${errors[0]}`;
      }

      Alert.alert("Import Complete", message, [
        { text: "Done", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || "Import failed. Please check your CSV format.";
      Alert.alert("Import Failed", detail);
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Import Items from CSV</Text>
        <Text style={styles.subtitle}>
          Upload a CSV file from your device. We will automatically match columns like Name, SKU, and Quantity for you.
        </Text>

        <Button 
          title={fileName ? "Change File" : "Select CSV File"} 
          variant="secondary"
          onPress={handlePickFile}
          isLoading={loading}
          disabled={importing}
        />

        {fileName && (
          <View style={styles.infoBox}>
            <Text style={styles.fileName}>📄 {fileName}</Text>
            <Text style={styles.rowCount}>{csvData?.rows.length} rows detected.</Text>
          </View>
        )}
      </Card>

      {csvData && (
        <Card style={styles.mappingCard}>
          <Text style={styles.sectionTitle}>Detected Mappings</Text>
          <View style={styles.mappingList}>
            {Object.entries(mapping).map(([field, header]) => (
              <View key={field} style={styles.mappingRow}>
                <Text style={styles.mappingField}>{field.replace(/_/g, ' ')}</Text>
                <Text style={styles.mappingArrow}>→</Text>
                <Text style={styles.mappingHeader}>{header}</Text>
              </View>
            ))}
            {Object.keys(mapping).length === 0 && (
              <Text style={styles.emptyMapping}>No automatic matches found. Please ensure your CSV headers are clear (e.g., "Name", "SKU").</Text>
            )}
          </View>

          <Button 
            title={importing ? "Importing..." : "Confirm Import"}
            onPress={handleConfirmImport}
            isLoading={importing}
            style={{ marginTop: 16 }}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileName: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  rowCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  mappingCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  mappingList: {
    gap: 12,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mappingField: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  mappingArrow: {
    marginHorizontal: 12,
    color: colors.textSecondary,
  },
  mappingHeader: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },
  emptyMapping: {
    color: colors.danger,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  }
});
