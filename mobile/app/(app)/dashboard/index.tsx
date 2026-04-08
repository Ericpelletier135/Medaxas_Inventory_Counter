import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { colors } from '../../../src/theme/colors';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Dashboard</Text>
        <Text style={styles.subtitle}>Overview of your inventory counts</Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>
          <Text style={styles.cardText}>Create and manage your item catalogue.</Text>
          <Button 
            title="Manage Items" 
            onPress={() => router.push('/(app)/items')} 
            style={styles.actionBtn}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Vendors</Text>
          <Text style={styles.cardText}>Manage your list of suppliers and contacts.</Text>
          <Button 
            title="Manage Vendors" 
            onPress={() => router.push('/(app)/vendors')} 
            style={styles.actionBtn}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Stock Counts</Text>
          <Text style={styles.cardText}>Manage physical inventory counts.</Text>
          <Button 
            title="View Sessions" 
            onPress={() => router.push('/(app)/stock-counts')} 
            style={styles.actionBtn}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sales Orders</Text>
          <Text style={styles.cardText}>Review generated purchase orders.</Text>
          <Button 
            title="View Orders" 
            onPress={() => router.push('/(app)/sales-orders')} 
            style={styles.actionBtn}
          />
        </Card>
      </View>

      <Button title="Logout" variant="secondary" onPress={handleLogout} style={styles.logoutBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 24,
    marginTop: 12,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardText: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionBtn: {
    alignSelf: 'flex-start',
  },
  logoutBtn: {
    marginTop: 32,
    marginBottom: 40,
  }
});
