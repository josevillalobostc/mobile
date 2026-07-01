import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getConceptDetail, getRelatedConcepts, getFlashcardsForConcept, getAllPrerequisites,
  updateConcept, addFlashcardToConcept, setConfidenceLevel, getRootComments, createComment, deleteComment,
} from '../api';
import type { ConceptDetailResponse, ConceptResponse, FlashcardResponse, CommentResponse } from '../types';
import { getConfidenceBadge } from '../types';
import { useFetch } from '../hooks/useFetch';
import Spinner from '../components/ui/Spinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { ConfidenceLevelBadge, TagBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function ConceptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: detail, loading, error, refetch } = useFetch<ConceptDetailResponse>(
    () => getConceptDetail(id!), [id]
  );
  const { data: related } = useFetch<ConceptResponse[]>(() => getRelatedConcepts(id!), [id]);
  const { data: prerequisites } = useFetch<ConceptResponse[]>(() => getAllPrerequisites(id!), [id]);
  const { data: flashcards, refetch: refetchFlashcards } = useFetch<FlashcardResponse[]>(() => getFlashcardsForConcept(id!), [id]);
  const { data: comments, refetch: refetchComments } = useFetch<CommentResponse[]>(() => getRootComments(id!), [id]);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showAddFlashcard, setShowAddFlashcard] = useState(false);
  const [addingFlashcard, setAddingFlashcard] = useState(false);
  const [fcFront, setFcFront] = useState('');
  const [fcBack, setFcBack] = useState('');
  const [fcHint, setFcHint] = useState('');
  const [fcDifficulty, setFcDifficulty] = useState('2');
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const handleEdit = () => {
    if (!detail) return;
    setEditTitle(detail.title);
    setEditContent(detail.content);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      await updateConcept(id!, { title: editTitle, content: editContent });
      setEditing(false);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to update concept');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddFlashcard = async () => {
    if (!fcFront.trim() || !fcBack.trim()) {
      Alert.alert('Error', 'Question and answer are required');
      return;
    }
    const diff = parseInt(fcDifficulty);
    if (isNaN(diff) || diff < 1 || diff > 5) {
      Alert.alert('Error', 'Difficulty must be 1-5');
      return;
    }
    setAddingFlashcard(true);
    try {
      await addFlashcardToConcept(id!, { front: fcFront, back: fcBack, hint: fcHint || undefined, difficulty: diff });
      setShowAddFlashcard(false);
      setFcFront(''); setFcBack(''); setFcHint(''); setFcDifficulty('2');
      refetchFlashcards();
    } catch {
      Alert.alert('Error', 'Failed to add flashcard');
    } finally {
      setAddingFlashcard(false);
    }
  };

  const handleSetConfidence = async (level: number) => {
    try {
      await setConfidenceLevel(id!, level);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to update confidence');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await createComment({ content: commentText, conceptId: id! });
      setCommentText('');
      refetchComments();
    } catch {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            refetchComments();
          } catch {
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  if (loading) return <Spinner fullScreen />;
  if (error || !detail) return (
    <View style={styles.centered}>
      <ErrorMessage message={error || 'Concept not found'} onRetry={refetch} />
    </View>
  );

  const badge = getConfidenceBadge(detail.confidenceLevel);
  const confidenceLevels = [0, 25, 50, 75, 100];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Main card */}
      <View style={styles.card}>
        {/* Tags & Badge */}
        <View style={styles.tagsRow}>
          <ConfidenceLevelBadge badge={badge} />
          {(detail.tags ?? []).map((t) => (
            <TagBadge key={t.id} name={t.name} color={t.color} />
          ))}
        </View>

        {/* Title & Edit */}
        <View style={styles.titleRow}>
          {editing ? (
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[styles.input, styles.titleInput]}
              placeholder="Title"
              placeholderTextColor={COLORS.gray600}
            />
          ) : (
            <Text style={styles.titleText}>{detail.title}</Text>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={editing ? handleSaveEdit : handleEdit}
          >
            <Text style={styles.editBtnText}>{editing ? (editSaving ? '...' : '💾') : '✏️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {editing ? (
          <TextInput
            value={editContent}
            onChangeText={setEditContent}
            style={[styles.input, styles.contentInput]}
            multiline
            numberOfLines={4}
            placeholder="Content"
            placeholderTextColor={COLORS.gray600}
          />
        ) : (
          <Text style={styles.contentText}>{detail.content}</Text>
        )}
        {editing && (
          <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelEditText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{detail.connectionCount}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(detail.prerequisiteIds ?? []).length}</Text>
          <Text style={styles.statLabel}>Prerequisites</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{flashcards?.length || 0}</Text>
          <Text style={styles.statLabel}>Flashcards</Text>
        </View>
      </View>

      {/* Confidence */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>CONFIDENCE LEVEL</Text>
        <View style={styles.confidenceRow}>
          <ConfidenceLevelBadge badge={badge} />
          {detail.confidenceLevel !== null && (
            <Text style={styles.confidenceNum}>{detail.confidenceLevel}%</Text>
          )}
        </View>
        <View style={styles.confidenceBtns}>
          {confidenceLevels.map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.confidenceBtn,
                detail.confidenceLevel === lvl && styles.confidenceBtnActive,
              ]}
              onPress={() => handleSetConfidence(lvl)}
            >
              <Text style={[
                styles.confidenceBtnText,
                detail.confidenceLevel === lvl && styles.confidenceBtnTextActive,
              ]}>{lvl}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Flashcards */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>📚 Flashcards</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <TouchableOpacity
              style={styles.smBtn}
              onPress={() => router.push(`/flashcards?conceptId=${id}`)}
            >
              <Text style={styles.smBtnText}>Study</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smBtn, styles.smBtnPrimary]}
              onPress={() => setShowAddFlashcard(true)}
            >
              <Text style={[styles.smBtnText, { color: COLORS.white }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        {flashcards?.length === 0 ? (
          <Text style={styles.emptyText}>No flashcards yet. Add some to start studying!</Text>
        ) : (
          <View style={{ gap: SPACING.sm }}>
            {flashcards?.slice(0, 3).map((fc) => (
              <View key={fc.id} style={styles.fcCard}>
                <Text style={styles.fcFront}>{fc.front}</Text>
                <Text style={styles.fcBack}>{fc.back}</Text>
              </View>
            ))}
            {(flashcards?.length || 0) > 3 && (
              <Text style={styles.moreText}>+{(flashcards?.length || 0) - 3} more flashcards</Text>
            )}
          </View>
        )}
      </View>

      {/* Prerequisites */}
      {prerequisites && prerequisites.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PREREQUISITES</Text>
          {prerequisites.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={styles.listItem}
              onPress={() => router.push(`/concept/${p.id}`)}
            >
              <Text style={styles.listItemNum}>{i + 1}</Text>
              <Text style={styles.listItemText}>{p.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Related */}
      {related && related.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🌿 RELATED BRANCHES</Text>
          <View style={styles.chipRow}>
            {related.slice(0, 8).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.chip}
                onPress={() => router.push(`/concept/${r.id}`)}
              >
                <Text style={styles.chipText}>{r.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Study CTA */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.push(`/flashcards?conceptId=${id}`)}
      >
        <Text style={styles.primaryBtnText}>📖 Review Node</Text>
      </TouchableOpacity>

      {/* Comments */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💬 Comments</Text>
        <View style={styles.commentInput}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.gray600}
            style={[styles.input, styles.commentField]}
            multiline
          />
          <TouchableOpacity
            style={[styles.smBtn, styles.smBtnPrimary, { marginTop: SPACING.sm }]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || commentLoading}
          >
            <Text style={[styles.smBtnText, { color: COLORS.white }]}>
              {commentLoading ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
          {comments?.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment.authorUsername?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>{comment.authorUsername}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {comment.authorId === user?.id && (
                  <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                    <Text style={styles.deleteCommentText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          ))}
          {comments?.length === 0 && (
            <Text style={styles.emptyText}>No comments yet.</Text>
          )}
        </View>
      </View>

      {/* Add Flashcard Modal */}
      <Modal
        visible={showAddFlashcard}
        title="Add Flashcard"
        onClose={() => setShowAddFlashcard(false)}
        footer={
          <>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddFlashcard(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, addingFlashcard && styles.disabledBtn]}
              onPress={handleAddFlashcard}
              disabled={addingFlashcard}
            >
              <Text style={styles.confirmBtnText}>{addingFlashcard ? 'Adding...' : 'Add'}</Text>
            </TouchableOpacity>
          </>
        }
      >
        <View style={{ gap: SPACING.md }}>
          <View>
            <Text style={styles.label}>Question (Front)</Text>
            <TextInput
              value={fcFront}
              onChangeText={setFcFront}
              placeholder="What is...?"
              placeholderTextColor={COLORS.gray600}
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
            />
          </View>
          <View>
            <Text style={styles.label}>Answer (Back)</Text>
            <TextInput
              value={fcBack}
              onChangeText={setFcBack}
              placeholder="It is..."
              placeholderTextColor={COLORS.gray600}
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
            />
          </View>
          <View>
            <Text style={styles.label}>Hint (optional)</Text>
            <TextInput
              value={fcHint}
              onChangeText={setFcHint}
              placeholder="Think about..."
              placeholderTextColor={COLORS.gray600}
              style={styles.input}
            />
          </View>
          <View>
            <Text style={styles.label}>Difficulty (1–5)</Text>
            <TextInput
              value={fcDifficulty}
              onChangeText={setFcDifficulty}
              keyboardType="number-pad"
              style={[styles.input, { width: 80 }]}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  centered: { flex: 1, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  backBtn: { marginBottom: SPACING.md },
  backText: { color: COLORS.gray400, fontSize: FONT.base },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  titleText: { color: COLORS.white, fontSize: FONT.xxl, fontWeight: '700', flex: 1 },
  titleInput: { flex: 1, fontSize: FONT.xl, fontWeight: '700' },
  editBtn: { padding: SPACING.xs },
  editBtnText: { fontSize: 18 },
  contentText: { color: COLORS.gray300, fontSize: FONT.base, lineHeight: 22 },
  contentInput: { minHeight: 80, textAlignVertical: 'top' },
  cancelEditBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelEditText: { color: COLORS.gray400, fontSize: FONT.sm },
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
  multilineInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: { color: COLORS.green, fontSize: FONT.xxl, fontWeight: '800' },
  statLabel: { color: COLORS.gray500, fontSize: FONT.xs },
  sectionLabel: { color: COLORS.gray500, fontSize: FONT.xs, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { color: COLORS.white, fontWeight: '700', fontSize: FONT.base },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  confidenceNum: { color: COLORS.gray400, fontSize: FONT.sm },
  confidenceBtns: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  confidenceBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.dark,
  },
  confidenceBtnActive: { borderColor: COLORS.green, backgroundColor: COLORS.greenDim },
  confidenceBtnText: { color: COLORS.gray500, fontSize: FONT.sm },
  confidenceBtnTextActive: { color: COLORS.green, fontWeight: '700' },
  smBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  smBtnPrimary: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  smBtnText: { color: COLORS.gray400, fontSize: FONT.sm, fontWeight: '600' },
  fcCard: {
    backgroundColor: COLORS.dark,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  fcFront: { color: COLORS.white, fontSize: FONT.sm, fontWeight: '600' },
  fcBack: { color: COLORS.gray400, fontSize: FONT.xs, marginTop: 4 },
  moreText: { color: COLORS.gray500, fontSize: FONT.xs, textAlign: 'center' },
  emptyText: { color: COLORS.gray500, fontSize: FONT.sm },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  listItemNum: { color: COLORS.gray600, fontSize: FONT.xs, width: 20 },
  listItemText: { color: COLORS.gray300, fontSize: FONT.sm, flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    backgroundColor: COLORS.dark,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  chipText: { color: COLORS.gray300, fontSize: FONT.xs },
  primaryBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.base },
  commentInput: { gap: SPACING.xs },
  commentField: { minHeight: 60, textAlignVertical: 'top' },
  commentCard: {
    backgroundColor: COLORS.dark,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { color: COLORS.green, fontWeight: '700', fontSize: FONT.sm },
  commentAuthor: { color: COLORS.gray300, fontWeight: '600', fontSize: FONT.sm },
  commentDate: { color: COLORS.gray600, fontSize: FONT.xs },
  deleteCommentText: { color: COLORS.gray600, fontSize: FONT.md },
  commentContent: { color: COLORS.gray300, fontSize: FONT.sm, lineHeight: 20 },
  cancelBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.gray400, fontWeight: '600' },
  confirmBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, backgroundColor: COLORS.purple,
  },
  confirmBtnText: { color: COLORS.white, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  label: { color: COLORS.gray300, fontSize: FONT.sm, fontWeight: '500', marginBottom: 6 },
});
