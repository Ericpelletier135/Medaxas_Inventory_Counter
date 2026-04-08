import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function GenericPlaceholderScreen({ routeName }: { routeName: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{routeName}</Text>
      <Text style={styles.text}>This module is currently being built and data fetching will map directly via the client API similar to Items.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  text: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  }
});
