import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gyroscope } from 'expo-sensors';
import { getStudySession, getSessionByConcept, reviewFlashcard } from '../api';
import type { StudySessionResponse, FlashcardStudyResponse } from '../types';
import Spinner from '../components/ui/Spinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const RATINGS = [
  { rating: 1 as const, label: 'Again',  sublabel: '< 1 min',  color: COLORS.red,         bg: COLORS.redDim,    border: 'rgba(239,68,68,0.3)' },
  { rating: 2 as const, label: 'Hard',   sublabel: '< 10 min', color: COLORS.orange,      bg: COLORS.orangeDim, border: 'rgba(249,115,22,0.3)' },
  { rating: 3 as const, label: 'Good',   sublabel: '1–4 days', color: COLORS.purpleLight, bg: COLORS.purpleDim, border: 'rgba(124,58,237,0.4)' },
  { rating: 4 as const, label: 'Easy',   sublabel: '> 1 week', color: COLORS.green,       bg: COLORS.greenDim,  border: 'rgba(74,222,128,0.3)' },
];

export default function FlashcardsScreen() {
  const params = useLocalSearchParams<{ conceptId?: string }>();
  const conceptId = params.conceptId;
  const router = useRouter();
  const timer = useTimer();

  const [session, setSession] = useState<StudySessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = conceptId ? await getSessionByConcept(conceptId) : await getStudySession();
      setSession(data);
      setCurrentIndex(0);
      setReviewed(0);
      setFlipped(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load session';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [conceptId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const currentCard: FlashcardStudyResponse | undefined = session?.flashcards[currentIndex];
  const isFinished = session && currentIndex >= session.flashcards.length;

  useEffect(() => {
    if (flipped || !currentCard || isFinished) return;

    let subscription: ReturnType<typeof Gyroscope.addListener>;
    Gyroscope.setUpdateInterval(100);
    subscription = Gyroscope.addListener(gyroData => {
      const threshold = 3.5;
      if (
        Math.abs(gyroData.x) > threshold ||
        Math.abs(gyroData.y) > threshold ||
        Math.abs(gyroData.z) > threshold
      ) {
        setFlipped(true);
      }
    });

    return () => {
      if (subscription) subscription.remove();
    };
  }, [flipped, currentCard, isFinished]);
  const progress = session ? (reviewed / session.total) * 100 : 0;
  const phase = (currentCard?.reviewCount ?? 0) > 0 ? 'REVIEW PHASE' : 'LEARNING PHASE';

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard || ratingLoading || !flipped) return;
    setRatingLoading(true);
    try {
      await reviewFlashcard({ flashcardId: currentCard.id, rating });
      setReviewed((r) => r + 1);
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    } catch {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) return <Spinner fullScreen />;
  if (error) return (
    <View style={styles.centered}>
      <ErrorMessage message={error} onRetry={loadSession} />
    </View>
  );

  if (!session || session.total === 0) return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No cards due</Text>
      <Text style={styles.emptyText}>Great job! Check back later for your next session.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
        <Text style={styles.primaryBtnText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  if (isFinished) return (
    <View style={styles.centered}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>Session Complete!</Text>
      <Text style={styles.doneText}>
        Reviewed <Text style={{ color: COLORS.green, fontWeight: '700' }}>{reviewed}</Text> cards in {timer}
      </Text>
      <View style={styles.doneActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={loadSession}>
          <Text style={styles.secondaryBtnText}>🔄 New Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Progress header */}
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.progressLabel}>SESSION PROGRESS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={styles.progressCurrent}>{reviewed}</Text>
            <Text style={styles.progressTotal}>/{session.total}</Text>
            <Text style={styles.progressSub}> reviewed</Text>
          </View>
        </View>
        <View style={styles.progressMeta}>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>{phase}</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏱ {timer}</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Card */}
      <ScrollView contentContainerStyle={styles.cardArea}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => !flipped && setFlipped(true)}
          style={[styles.flashcard, flipped && styles.flashcardFlipped]}
        >
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardMeta}>
              {currentCard?.conceptTag && (
                <View style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{currentCard.conceptTag.toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.cardConceptTitle}>{currentCard?.conceptTitle}</Text>
            </View>
            {flipped && (
              <View style={styles.answerBadge}>
                <Text style={styles.answerBadgeText}>ANSWER</Text>
              </View>
            )}
          </View>

          {/* Card body */}
          <View style={styles.cardBody}>
            <Text style={styles.cardText}>
              {flipped ? currentCard?.back : currentCard?.front}
            </Text>
            {!flipped && currentCard?.hint && (
              <View style={styles.hintBadge}>
                <Text style={styles.hintText}>◈ CONCEPT: {currentCard.hint.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Card footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>
              {flipped ? 'Tap a rating below' : 'Tap to reveal answer'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Rating buttons */}
        <View style={styles.ratingsGrid}>
          {RATINGS.map(({ rating, label, sublabel, color, bg, border }) => (
            <TouchableOpacity
              key={rating}
              onPress={() => handleRating(rating)}
              disabled={ratingLoading || !flipped}
              style={[
                styles.ratingBtn,
                { borderColor: flipped ? border : COLORS.border, backgroundColor: flipped ? bg : 'transparent' },
                (!flipped || ratingLoading) && styles.ratingBtnDisabled,
              ]}
            >
              <View style={[styles.ratingIcon, { backgroundColor: flipped ? bg : 'rgba(255,255,255,0.04)' }]}>
                <Text style={{ color: flipped ? color : COLORS.gray600, fontSize: 18 }}>
                  {rating === 1 ? '🔄' : rating === 2 ? '⚡' : rating === 3 ? '✓' : '🚀'}
                </Text>
              </View>
              <Text style={[styles.ratingLabel, { color: flipped ? COLORS.white : COLORS.gray600 }]}>{label}</Text>
              <Text style={styles.ratingSublabel}>{sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  centered: { flex: 1, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.lg },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  progressLabel: { color: COLORS.gray500, fontSize: FONT.xs, fontWeight: '700', letterSpacing: 1 },
  progressCurrent: { color: COLORS.white, fontSize: FONT.xxxl, fontWeight: '800' },
  progressTotal: { color: COLORS.gray500, fontSize: FONT.xxl },
  progressSub: { color: COLORS.gray400, fontSize: FONT.sm },
  progressMeta: { gap: SPACING.sm, alignItems: 'flex-end' },
  phaseBadge: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  phaseBadgeText: { color: COLORS.purpleLight, fontSize: FONT.xs, fontWeight: '700' },
  timerBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  timerText: { color: COLORS.white, fontSize: FONT.sm, fontFamily: 'monospace' },
  progressBarBg: { height: 6, backgroundColor: COLORS.border, marginHorizontal: SPACING.xl, borderRadius: RADIUS.full },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.purple,
  },
  cardArea: { padding: SPACING.xl, gap: SPACING.lg },
  flashcard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  flashcardFlipped: {
    borderColor: 'rgba(124,58,237,0.35)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  tagChip: {
    backgroundColor: COLORS.purpleDim,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagChipText: { color: COLORS.purpleLight, fontSize: FONT.xs - 1, fontWeight: '700' },
  cardConceptTitle: { color: COLORS.gray400, fontSize: FONT.sm, flex: 1 },
  answerBadge: {
    backgroundColor: COLORS.purpleDim,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  answerBadgeText: { color: COLORS.purpleLight, fontSize: FONT.xs, fontWeight: '700' },
  cardBody: { padding: SPACING.xxl, alignItems: 'center', minHeight: 200, justifyContent: 'center', gap: SPACING.lg },
  cardText: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '600', textAlign: 'center', lineHeight: 28 },
  hintBadge: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  hintText: { color: COLORS.purpleLight, fontSize: FONT.xs },
  cardFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  cardFooterText: { color: COLORS.gray600, fontSize: FONT.xs },
  ratingsGrid: { flexDirection: 'row', gap: SPACING.sm },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  ratingBtnDisabled: { opacity: 0.4 },
  ratingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingLabel: { fontSize: FONT.sm, fontWeight: '700' },
  ratingSublabel: { color: COLORS.gray500, fontSize: FONT.xs },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700' },
  emptyText: { color: COLORS.gray400, fontSize: FONT.base, textAlign: 'center' },
  doneIcon: { fontSize: 56 },
  doneTitle: { color: COLORS.white, fontSize: FONT.xxl, fontWeight: '700' },
  doneText: { color: COLORS.gray400, fontSize: FONT.base },
  doneActions: { flexDirection: 'row', gap: SPACING.md },
  primaryBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.base },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  secondaryBtnText: { color: COLORS.gray300, fontWeight: '600', fontSize: FONT.base },
});
