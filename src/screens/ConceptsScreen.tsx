import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  FlatList, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { getConcepts, searchConcepts, createConcept, deleteConcept, getPublicWorkspace, getMyWorkspaces } from '../api';
import type { ConceptResponse, PageResponse, WorkspaceResponse } from '../types';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import Spinner from '../components/ui/Spinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { TagBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function ConceptsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ConceptResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  useEffect(() => {
    Promise.all([getMyWorkspaces(0, 100), getPublicWorkspace()])
      .then(([myRes, pubRes]) => {
        const all = [...(myRes.content || []), ...(pubRes.content || [])];
        const unique = Array.from(new Map(all.map(w => [w.id, w])).values());
        setWorkspaces(unique);
        if (unique.length > 0) {
          const pub = unique.find(w => w.name === 'Grove Global Community' || w.isPublic);
          setSelectedWorkspaceId(pub ? pub.id : unique[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const { data, loading, error, refetch } = useFetch<PageResponse<ConceptResponse>>(
    (signal) => {
      if (debouncedSearch.trim()) {
        return searchConcepts(debouncedSearch, page, 20, signal);
      }
      return getConcepts(page, 20, 'title,asc', signal);
    },
    [page, debouncedSearch]
  );

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Title and content are required');
      return;
    }
    setCreating(true);
    try {
      if (!selectedWorkspaceId) throw new Error('No workspace selected');
      await createConcept({ title: newTitle.trim(), content: newContent.trim(), workspaceId: selectedWorkspaceId });
      Alert.alert('Success', 'Concept created!');
      setShowCreate(false);
      setNewTitle('');
      setNewContent('');
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create concept';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConcept(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to delete concept');
    }
  };

  const renderItem = ({ item }: { item: ConceptResponse }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/concept/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setDeleteTarget(item)}
        >
          <Trash2 size={16} color={COLORS.red} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.tags}>
          {(item.tags ?? []).slice(0, 2).map((t) => (
            <TagBadge key={t.id} name={t.name} color={t.color} />
          ))}
        </View>
        <Text style={styles.connText}>{item.connectionCount} conn</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Concepts</Text>
          {data && <Text style={styles.headerSub}>{data.totalElements} total</Text>}
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search concepts..."
          placeholderTextColor={COLORS.gray600}
          style={styles.searchInput}
        />
      </View>

      {/* List */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.content || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>{search ? 'No results found' : 'No concepts yet'}</Text>
          }
          // Pagination footer
          ListFooterComponent={
            data && data.totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <Text style={styles.pageBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>{page + 1} / {data.totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= data.totalPages - 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages - 1}
                >
                  <Text style={styles.pageBtnText}>→</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={showCreate}
        title="New Concept"
        onClose={() => { setShowCreate(false); setNewTitle(''); setNewContent(''); }}
        footer={
          <>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowCreate(false); setNewTitle(''); setNewContent(''); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, creating && styles.disabledBtn]}
              onPress={handleCreate}
              disabled={creating}
            >
              <Text style={styles.confirmBtnText}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </>
        }
      >
        <View style={styles.formFields}>
          <View>
            <Text style={styles.label}>Workspace</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {workspaces.map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={[
                    styles.workspaceChip,
                    selectedWorkspaceId === ws.id && styles.workspaceChipSelected
                  ]}
                  onPress={() => setSelectedWorkspaceId(ws.id)}
                >
                  <Text style={[
                    styles.workspaceChipText,
                    selectedWorkspaceId === ws.id && styles.workspaceChipTextSelected
                  ]}>
                    {ws.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Concept title"
              placeholderTextColor={COLORS.gray600}
              style={styles.formInput}
            />
          </View>
          <View>
            <Text style={styles.label}>Content</Text>
            <TextInput
              value={newContent}
              onChangeText={setNewContent}
              placeholder="Describe this concept..."
              placeholderTextColor={COLORS.gray600}
              style={[styles.formInput, styles.multiline]}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={!!deleteTarget}
        title="Delete Concept"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete}>
              <Text style={styles.dangerBtnText}>Delete</Text>
            </TouchableOpacity>
          </>
        }
      >
        <Text style={styles.deleteText}>
          Are you sure you want to delete <Text style={{ color: COLORS.white, fontWeight: '700' }}>"{deleteTarget?.title}"</Text>?{'\n'}This cannot be undone.
        </Text>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  headerTitle: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700' },
  headerSub: { color: COLORS.gray500, fontSize: FONT.sm },
  createBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  createBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.sm },
  searchBox: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    color: COLORS.white,
    fontSize: FONT.base,
  },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.xs },
  cardTitle: { color: COLORS.white, fontWeight: '600', fontSize: FONT.base, flex: 1 },
  deleteBtn: { padding: 4 },
  cardContent: { color: COLORS.gray400, fontSize: FONT.xs, lineHeight: 16, marginBottom: SPACING.sm },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 },
  connText: { color: COLORS.gray600, fontSize: FONT.xs },
  empty: { color: COLORS.gray500, textAlign: 'center', paddingVertical: SPACING.xxl, fontSize: FONT.base },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.xl },
  pageBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { color: COLORS.white, fontWeight: '700' },
  pageInfo: { color: COLORS.gray400, fontSize: FONT.base },
  formFields: { gap: SPACING.md },
  label: { color: COLORS.gray300, fontSize: FONT.sm, fontWeight: '500', marginBottom: 6 },
  formInput: {
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.white,
    fontSize: FONT.base,
  },
  workspaceChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  workspaceChipSelected: {
    backgroundColor: COLORS.purpleDim,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  workspaceChipText: { color: COLORS.gray400, fontSize: FONT.sm },
  workspaceChipTextSelected: { color: COLORS.purpleLight, fontWeight: '700' },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.md },
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.gray400, fontWeight: '600' },
  confirmBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purple,
  },
  confirmBtnText: { color: COLORS.white, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  dangerBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.redDim,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  dangerBtnText: { color: COLORS.red, fontWeight: '700' },
  deleteText: { color: COLORS.gray300, fontSize: FONT.base, lineHeight: 22 },
});
