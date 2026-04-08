import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { colors, radius } from '../theme/colors';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({ title, variant = 'primary', isLoading = false, style, disabled, ...props }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? '#FFF' : colors.textPrimary} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.65,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryText: {
    color: '#FFF',
  },
  secondaryText: {
    color: colors.textPrimary,
  },
});
