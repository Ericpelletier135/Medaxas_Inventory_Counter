import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  Switch, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius } from '@/src/theme/colors';
import { Input } from '@/src/components/Input';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import client from '@/src/api/client';

export default function CreateUserScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!email || !password) {
      Alert.alert('Error', 'Email and Password are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        email: email.trim(),
        password,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        is_admin: isAdmin,
        is_active: isActive,
        status: isActive ? 'active' : 'inactive'
      };

      await client.post('/api/admin/users', payload);
      Alert.alert('Success', 'User created successfully.');
      router.back();
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail;
      Alert.alert('Error', detail === 'EMAIL_ALREADY_EXISTS' ? 'Email already exists.' : 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>New User</Text>
          <Text style={styles.subtitle}>Fill in the details to create a new system account.</Text>

          <Input 
            label="Email Address"
            placeholder="e.g. user@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input 
            label="Initial Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input 
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input 
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Administrator Access</Text>
              <Text style={styles.switchSublabel}>Grant full system permissions</Text>
            </View>
            <Switch 
              value={isAdmin}
              onValueChange={setIsAdmin}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={isAdmin ? colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Account Status</Text>
              <Text style={styles.switchSublabel}>{isActive ? 'User can log in' : 'User is blocked'}</Text>
            </View>
            <Switch 
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
              thumbColor={isActive ? '#10b981' : '#f4f3f4'}
            />
          </View>

          <Button 
            title={saving ? "Creating User..." : "Create User"} 
            onPress={handleCreate}
            isLoading={saving}
            disabled={saving}
            style={{ marginTop: 24 }}
          />

          <Button 
            title="Cancel" 
            variant="secondary" 
            onPress={() => router.back()}
            disabled={saving}
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  card: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  row: { flexDirection: 'row' },
  switchRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: radius.md,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  switchSublabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
