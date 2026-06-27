import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';

interface Props {
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export default function Spinner({ fullScreen = false, size = 'large' }: Props) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={COLORS.green} />
      </View>
    );
  }
  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={COLORS.green} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dark,
  },
  inline: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
