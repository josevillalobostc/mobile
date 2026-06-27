import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT, SPACING, RADIUS } from '../../theme';
import type { ConfidenceBadge } from '../../types';

interface TagBadgeProps {
  name: string;
  color?: string;
}

export function TagBadge({ name, color }: TagBadgeProps) {
  const bg = color ? `${color}20` : COLORS.purpleDim;
  const border = color ? `${color}40` : 'rgba(124,58,237,0.35)';
  return (
    <View style={[styles.tagBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.tagText, { color: color || COLORS.purpleLight }]}>{name}</Text>
    </View>
  );
}

const CONFIDENCE_CONFIG: Record<NonNullable<ConfidenceBadge>, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: 'Not Started', color: COLORS.gray500, bg: 'rgba(107,114,128,0.1)' },
  LEARNING:    { label: 'Learning',    color: '#fb923c',       bg: 'rgba(249,115,22,0.1)' },
  REVIEWING:   { label: 'Reviewing',   color: '#facc15',       bg: 'rgba(250,204,21,0.1)' },
  HIGH:        { label: 'High',        color: COLORS.green,    bg: COLORS.greenDim },
  MASTERED:    { label: 'Mastered',    color: COLORS.purpleLight, bg: COLORS.purpleDim },
};

interface ConfidenceLevelBadgeProps {
  badge: ConfidenceBadge;
}

export function ConfidenceLevelBadge({ badge }: ConfidenceLevelBadgeProps) {
  if (!badge) return null;
  const cfg = CONFIDENCE_CONFIG[badge];
  return (
    <View style={[styles.tagBadge, { backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }]}>
      <Text style={[styles.tagText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tagBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FONT.xs,
    fontWeight: '600',
  },
});
