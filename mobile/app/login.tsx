import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { colors } from '../src/theme/colors';
import client from '../src/api/client';
import axios from 'axios';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // The backend expects x-www-form-urlencoded
      const res = await client.post('/api/auth/login/refresh', 
        { username: email, password },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Save tokens securely
      await SecureStore.setItemAsync('access_token', res.data.access_token);
      await SecureStore.setItemAsync('refresh_token', res.data.refresh_token);
      
      // Determine user role and route to the correct layout (simplified example)
      // Usually you would fetch the user profile here just like in the web app
      try {
        const userRes = await client.get('/api/users/me', {
          headers: { Authorization: `Bearer ${res.data.access_token}` }
        });

        // Save is_admin status for RBAC
        await SecureStore.setItemAsync('is_admin', String(userRes.data?.is_admin || false));

        if (userRes.data?.is_admin) {
          router.replace('/(app)/admin');
        } else {
          router.replace('/(app)/dashboard');
        }
      } catch (e) {
        // Default to dashboard if fetching fails
        await SecureStore.setItemAsync('is_admin', 'false');
        router.replace('/(app)/dashboard');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.detail || 'Login failed');
      } else {
        setError('Network error. Check your connection or API URL.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Medaxas</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <Card>
          <Input 
            label="Email" 
            placeholder="you@example.com" 
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input 
            label="Password" 
            placeholder="••••••••" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <Button 
            title="Sign In" 
            onPress={handleLogin} 
            isLoading={loading}
            style={styles.button}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  }
});
