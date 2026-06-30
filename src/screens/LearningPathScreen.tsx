import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getPublicWorkspace, getLearningPath } from '../api';
import type { ConceptResponse } from '../types';
import Spinner from '../components/ui/Spinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { TagBadge } from '../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function LearningPathScreen() {
  const router = useRouter();
  const [concepts, setConcepts] = useState<ConceptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getPublicWorkspace()
      .then((ws) => {
        const workspaceId = ws.content[0]?.id;
        if (!workspaceId) throw new Error('No public workspace found');
        return getLearningPath(workspaceId);
      })
      .then(setConcepts)
      .catch((err) => {
        if (!controller.signal.aborted) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load learning path';
          setError(msg);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) return <Spinner fullScreen />;
  if (error) return (
    <View style={styles.centered}>
      <ErrorMessage message={error} onRetry={() => { setError(null); setLoading(true); }} />
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🗺</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>Learning Path</Text>
          <Text style={styles.headerSub}>
            {concepts.length} concepts, ordered from fundamentals to advanced
          </Text>
        </View>
      </View>

      {concepts.length === 0 ? (
        <Text style={styles.emptyText}>No concepts in this workspace yet</Text>
      ) : (
        <View style={styles.timeline}>
          {/* Vertical line */}
          <View style={styles.timelineLine} />

          {concepts.map((concept, index) => {
            const hasPrereqs = (concept.prerequisiteIds ?? []).length > 0;
            const isFirst = index === 0;

            return (
              <View key={concept.id} style={styles.timelineItem}>
                {/* Marker */}
                <View style={[
                  styles.marker,
                  isFirst ? styles.markerFirst : hasPrereqs ? styles.markerLocked : styles.markerOpen,
                ]}>
                  <Text style={styles.markerText}>
                    {isFirst ? '✓' : hasPrereqs ? '🔒' : String(index + 1)}
                  </Text>
                </View>

                {/* Card */}
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => router.push(`/concept/${concept.id}`)}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardMeta}>
                        <Text style={styles.cardNum}>#{index + 1}</Text>
                        {!hasPrereqs && (
                          <View style={styles.foundationBadge}>
                            <Text style={styles.foundationText}>Foundation</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardTitle}>{concept.title}</Text>
                      <Text style={styles.cardContent} numberOfLines={2}>{concept.content}</Text>
                      {hasPrereqs && (
                        <View style={styles.prereqRow}>
                          <Text style={styles.prereqLabel}>Requires: </Text>
                          {(concept.prerequisiteTitles ?? []).slice(0, 2).map((t, i) => (
                            <Text key={i} style={styles.prereqChip}>{t}</Text>
                          ))}
                          {(concept.prerequisiteTitles ?? []).length > 2 && (
                            <Text style={styles.prereqMore}>+{(concept.prerequisiteTitles ?? []).length - 2}</Text>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.cardRight}>
                      <View style={styles.cardTags}>
                        {(concept.tags ?? []).slice(0, 2).map((t) => (
                          <TagBadge key={t.id} name={t.name} color={t.color} />
                        ))}
                      </View>
                      <Text style={styles.cardConn}>{concept.connectionCount} conn ›</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  centered: { flex: 1, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.xxl },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 20 },
  headerTitle: { color: COLORS.white, fontSize: FONT.xxl, fontWeight: '700' },
  headerSub: { color: COLORS.gray400, fontSize: FONT.sm },
  emptyText: { color: COLORS.gray500, textAlign: 'center', paddingVertical: SPACING.xxl, fontSize: FONT.base },
  timeline: { position: 'relative', gap: SPACING.md },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: COLORS.border,
    zIndex: 0,
  },
  timelineItem: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', zIndex: 1 },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    flexShrink: 0,
    backgroundColor: COLORS.surface,
  },
  markerFirst: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  markerLocked: { borderColor: COLORS.border },
  markerOpen: { borderColor: 'rgba(96,165,250,0.4)', backgroundColor: COLORS.blueDim },
  markerText: { fontSize: FONT.xs, fontWeight: '700', color: COLORS.dark },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  cardHeaderRow: { flexDirection: 'row', gap: SPACING.sm },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  cardNum: { color: COLORS.gray600, fontSize: FONT.xs, fontFamily: 'monospace' },
  foundationBadge: {
    backgroundColor: COLORS.blueDim,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
  },
  foundationText: { color: COLORS.blue, fontSize: FONT.xs },
  cardTitle: { color: COLORS.white, fontWeight: '600', fontSize: FONT.base, marginBottom: SPACING.xs },
  cardContent: { color: COLORS.gray400, fontSize: FONT.xs, lineHeight: 16, marginBottom: SPACING.xs },
  prereqRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  prereqLabel: { color: COLORS.gray500, fontSize: FONT.xs },
  prereqChip: {
    backgroundColor: COLORS.dark,
    color: COLORS.gray400,
    fontSize: FONT.xs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prereqMore: { color: COLORS.gray500, fontSize: FONT.xs },
  cardRight: { alignItems: 'flex-end', gap: SPACING.xs },
  cardTags: { gap: 4, alignItems: 'flex-end' },
  cardConn: { color: COLORS.gray500, fontSize: FONT.xs },
});
