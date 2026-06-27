import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getTags, getConceptsByCluster } from '../api';
import type { Tag, ConceptResponse, PageResponse } from '../types';
import { useFetch } from '../hooks/useFetch';
import Spinner from '../components/ui/Spinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { TagBadge } from '../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function ClustersScreen() {
  const router = useRouter();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const { data: tagsData, loading: tagsLoading } = useFetch<PageResponse<Tag>>(
    () => getTags(0, 100)
  );

  const [concepts, setConcepts] = useState<PageResponse<ConceptResponse> | null>(null);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [conceptsError, setConceptsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTagId) { setConcepts(null); return; }
    setConceptsLoading(true);
    getConceptsByCluster(selectedTagId, 0, 50)
      .then(setConcepts)
      .catch(() => setConceptsError('Failed to load concepts for this cluster'))
      .finally(() => setConceptsLoading(false));
  }, [selectedTagId]);

  const tags = tagsData?.content || [];
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  return (
    <View style={styles.root}>
      {/* Tags sidebar */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>🌿 Clusters</Text>
        {tagsLoading ? (
          <Spinner size="small" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagItem, tag.id === selectedTagId && styles.tagItemActive]}
                onPress={() => setSelectedTagId(tag.id)}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.color || COLORS.green }]} />
                <Text style={[styles.tagName, tag.id === selectedTagId && styles.tagNameActive]}>
                  {tag.name}
                </Text>
                <Text style={styles.tagChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Main content */}
      <View style={styles.main}>
        {!selectedTagId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyTitle}>Select a Cluster</Text>
            <Text style={styles.emptyText}>
              Choose a knowledge cluster from the sidebar to explore its concepts.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.clusterHeader}>
              <TagBadge name={selectedTag?.name || ''} color={selectedTag?.color} />
              <Text style={styles.clusterTitle}>{selectedTag?.name}</Text>
              {concepts && (
                <Text style={styles.clusterSub}>{concepts.totalElements} concepts</Text>
              )}
            </View>

            {conceptsLoading ? (
              <Spinner />
            ) : conceptsError ? (
              <ErrorMessage message={conceptsError} />
            ) : concepts?.content.length === 0 ? (
              <Text style={styles.emptyText}>No concepts in this cluster yet</Text>
            ) : (
              <FlatList
                data={concepts?.content || []}
                keyExtractor={(item) => item.id}
                numColumns={1}
                contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.xxl }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.conceptCard}
                    onPress={() => router.push(`/concept/${item.id}`)}
                  >
                    <View style={styles.conceptCardHeader}>
                      <Text style={styles.conceptTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.conceptConn}>{item.connectionCount} conn</Text>
                    </View>
                    <Text style={styles.conceptContent} numberOfLines={3}>{item.content}</Text>
                    <View style={styles.conceptTags}>
                      {(item.tags ?? []).slice(0, 3).map((t) => (
                        <TagBadge key={t.id} name={t.name} color={t.color} />
                      ))}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.dark },
  sidebar: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    padding: SPACING.sm,
  },
  sidebarTitle: { color: COLORS.white, fontWeight: '700', fontSize: FONT.sm, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: 2,
  },
  tagItemActive: { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagName: { color: COLORS.gray400, fontSize: FONT.xs, flex: 1 },
  tagNameActive: { color: COLORS.green },
  tagChevron: { color: COLORS.gray600, fontSize: FONT.sm },
  main: { flex: 1, padding: SPACING.md },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700' },
  emptyText: { color: COLORS.gray400, fontSize: FONT.base, textAlign: 'center' },
  clusterHeader: { gap: SPACING.xs, marginBottom: SPACING.lg },
  clusterTitle: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700' },
  clusterSub: { color: COLORS.gray400, fontSize: FONT.sm },
  conceptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  conceptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.xs },
  conceptTitle: { color: COLORS.white, fontWeight: '600', fontSize: FONT.sm, flex: 1 },
  conceptConn: { color: COLORS.gray600, fontSize: FONT.xs },
  conceptContent: { color: COLORS.gray400, fontSize: FONT.xs, lineHeight: 16, marginBottom: SPACING.sm },
  conceptTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
