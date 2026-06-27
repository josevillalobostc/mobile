import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../../theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  multiline?: boolean;
  numberOfLines?: number;
  label?: string;
  error?: string;
}

// Re-export for convenience
export { default as Spinner } from './Spinner';
export { default as ErrorMessage } from './ErrorMessage';
export { TagBadge, ConfidenceLevelBadge } from './Badge';
export { default as Modal } from './Modal';

interface GroveInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad';
  multiline?: boolean;
  numberOfLines?: number;
  label?: string;
  error?: string;
  style?: object;
}

export function GroveInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  label,
  error,
  style,
}: GroveInputProps) {
  const { TextInput } = require('react-native');
  return (
    <View>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray600}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        style={[inputStyles.input, multiline && inputStyles.multiline, style]}
      />
      {error && <Text style={inputStyles.error}>{error}</Text>}
    </View>
  );
}

interface GroveBtnProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  small?: boolean;
  style?: object;
}

export function GroveBtn({ onPress, title, variant = 'primary', disabled = false, small = false, style }: GroveBtnProps) {
  const btnStyle = variant === 'primary'
    ? btnStyles.primary
    : variant === 'danger'
    ? btnStyles.danger
    : btnStyles.secondary;
  const textStyle = variant === 'primary'
    ? btnStyles.primaryText
    : variant === 'danger'
    ? btnStyles.dangerText
    : btnStyles.secondaryText;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[btnStyles.base, btnStyle, small && btnStyles.small, disabled && btnStyles.disabled, style]}
    >
      <Text style={[btnStyles.baseText, textStyle, small && btnStyles.smallText]}>{title}</Text>
    </TouchableOpacity>
  );
}

const inputStyles = StyleSheet.create({
  label: {
    color: COLORS.gray300,
    fontSize: FONT.sm,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.white,
    fontSize: FONT.base,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  error: {
    color: COLORS.red,
    fontSize: FONT.xs,
    marginTop: 4,
  },
});

const btnStyles = StyleSheet.create({
  base: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.purple,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  danger: {
    backgroundColor: COLORS.redDim,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  small: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '600',
    fontSize: FONT.base,
  },
  primaryText: { color: COLORS.white },
  secondaryText: { color: COLORS.gray400 },
  dangerText: { color: COLORS.red },
  smallText: { fontSize: FONT.sm },
});
