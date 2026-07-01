import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Dimensions, PanResponder, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import * as d3 from 'd3-force';

import { getPublicGraph, getNeighborhoodGraph, searchConcepts, getMyWorkspaces, getPublicWorkspace, getGraphByWorkspace } from '../api';
import type { GraphNode, GraphResponse, ConceptResponse, WorkspaceResponse } from '../types';
import { ScrollView } from 'react-native';
import { useDebounce } from '../hooks/useDebounce';
import ErrorMessage from '../components/ui/ErrorMessage';
import { TagBadge } from '../components/ui/Badge';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GraphScreen() {
  const router = useRouter();

  // ─── Graph data ────────────────────────────────────────────────────────────
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadGraph = useCallback(async () => {
    if (!selectedWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getGraphByWorkspace(selectedWorkspaceId);
      setGraph(data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || 'Error loading graph');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ─── Selection / subgraph ──────────────────────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [subgraph, setSubgraph] = useState<GraphResponse | null>(null);

  // ─── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConceptResponse[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    const controller = new AbortController();
    searchConcepts(debouncedSearch, 0, 10, controller.signal)
      .then((res) => setSearchResults(res.content))
      .catch(() => {})
      .finally(() => setSearchLoading(false));
    return () => controller.abort();
  }, [debouncedSearch]);

  // ─── Simulation ────────────────────────────────────────────────────────────
  const [simulationNodes, setSimulationNodes] = useState<any[]>([]);
  const [simulationLinks, setSimulationLinks] = useState<any[]>([]);
  const simulationRef = useRef<any>(null);

  const activeGraph = subgraph || graph;

  useEffect(() => {
    if (!activeGraph || activeGraph.nodes.length === 0) {
      setSimulationNodes([]);
      setSimulationLinks([]);
      return;
    }

    // Stop any running simulation
    simulationRef.current?.stop();

    // Deep-clone so D3 can mutate freely
    const nodes: any[] = activeGraph.nodes.map(n => ({
      ...n,
      x: SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100,
      y: SCREEN_HEIGHT / 2 + (Math.random() - 0.5) * 100,
    }));

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // Build links with actual node object references D3 expects
    const links: any[] = activeGraph.edges
      .map(e => {
        const src = nodeById.get(e.source);
        const tgt = nodeById.get(e.target);
        if (!src || !tgt) return null;
        return { source: src, target: tgt };
      })
      .filter(Boolean);

    const sim = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-250))
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(120)
          .strength(1)
      )
      .force('center', d3.forceCenter(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2))
      .force('collision', d3.forceCollide(28))
      .alphaDecay(0.02)
      .on('tick', () => {
        // Snapshot positions into new arrays so React re-renders
        setSimulationNodes(nodes.map(n => ({ ...n })));
        setSimulationLinks(
          links.map(l => ({
            x1: l.source.x,
            y1: l.source.y,
            x2: l.target.x,
            y2: l.target.y,
          }))
        );
      });

    simulationRef.current = sim;

    // Reset pan
    panOffset.current = { x: 0, y: 0 };
    setPanX(0);
    setPanY(0);

    return () => { sim.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGraph]);

  // ─── Panning ───────────────────────────────────────────────────────────────
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const panOffset = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        // capture current offset at the start of each gesture
      },
      onPanResponderMove: (_, g) => {
        setPanX(panOffset.current.x + g.dx);
        setPanY(panOffset.current.y + g.dy);
      },
      onPanResponderRelease: (_, g) => {
        panOffset.current = {
          x: panOffset.current.x + g.dx,
          y: panOffset.current.y + g.dy,
        };
      },
    })
  ).current;

  // ─── Node press ────────────────────────────────────────────────────────────
  const handleNodePress = async (node: any) => {
    const original = activeGraph?.nodes.find(n => n.id === node.id);
    if (!original) return;
    setSelectedNode(original);
    try {
      const sub = await getNeighborhoodGraph(node.id);
      setSubgraph(sub);
    } catch {
      // ignore — keep showing current graph
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* SVG canvas */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <G x={panX} y={panY}>
            {/* Links */}
            {simulationLinks.map((link, i) => (
              <Line
                key={`link-${i}`}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                stroke={COLORS.border}
                strokeWidth="1.5"
                opacity={0.7}
              />
            ))}
            {/* Nodes */}
            {simulationNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <G key={`node-${node.id}`} onPress={() => handleNodePress(node)}>
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 20 : 14}
                    fill={isSelected ? COLORS.green : COLORS.purple}
                    stroke={isSelected ? COLORS.white : COLORS.purpleLight}
                    strokeWidth={isSelected ? 3 : 1}
                    opacity={0.95}
                  />
                  <SvgText
                    x={node.x}
                    y={node.y + (isSelected ? 32 : 26)}
                    fill={COLORS.gray300}
                    fontSize="11"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {node.title.length > 14 ? node.title.substring(0, 14) + '…' : node.title}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Foreground UI */}
      <View style={styles.uiLayer} pointerEvents="box-none">
        {/* Workspace Selector */}
        {workspaces.length > 0 && (
          <View style={styles.workspaceContainer}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {workspaces.map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={[
                    styles.workspaceChip,
                    selectedWorkspaceId === ws.id && styles.workspaceChipSelected
                  ]}
                  onPress={() => {
                    setSelectedWorkspaceId(ws.id);
                    setSubgraph(null);
                    setSelectedNode(null);
                  }}
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
        )}

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search concepts..."
            placeholderTextColor={COLORS.gray600}
            style={styles.searchInput}
          />
          {subgraph && (
            <TouchableOpacity
              style={styles.fullGraphBtn}
              onPress={() => { setSubgraph(null); setSelectedNode(null); }}
            >
              <Text style={styles.fullGraphText}>Full graph</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={loadGraph}>
            <Text>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Search dropdown */}
        {searchResults !== null && searchQuery.trim() ? (
          <View style={styles.searchDropdown}>
            {searchLoading ? (
              <Text style={styles.searchDropdownText}>Searching...</Text>
            ) : searchResults.length === 0 ? (
              <Text style={styles.searchDropdownText}>No results found</Text>
            ) : (
              searchResults.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.searchResult}
                  onPress={() => {
                    const node = graph?.nodes.find(n => n.id === c.id);
                    if (node) handleNodePress(node);
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                >
                  <Text style={styles.searchResultTitle}>{c.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                    {(c.tags ?? []).slice(0, 2).map(t => (
                      <TagBadge key={t.id} name={t.name} color={t.color} />
                    ))}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}

        {/* Stats bar */}
        {activeGraph && !loading && (
          <View style={styles.statsBar}>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{activeGraph.nodes.length}</Text>
              <Text style={styles.statPillLabel}> nodes</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{activeGraph.edges.length}</Text>
              <Text style={styles.statPillLabel}> edges</Text>
            </View>
            {subgraph && (
              <View style={[styles.statPill, styles.subgraphPill]}>
                <Text style={styles.subgraphPillText}>Subgraph view</Text>
              </View>
            )}
          </View>
        )}

        {/* Loading / error overlays */}
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.overlayText}>Loading graph…</Text>
          </View>
        )}
        {!loading && error && (
          <View style={styles.overlay}>
            <ErrorMessage message={error} onRetry={loadGraph} />
          </View>
        )}
        {!loading && !error && activeGraph && activeGraph.nodes.length === 0 && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>No concepts in graph yet.</Text>
          </View>
        )}

        {/* Selected node panel */}
        {selectedNode && !loading && !error && (
          <View style={styles.detailPanelWrapper} pointerEvents="box-none">
            <View style={styles.detailPanel}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle} numberOfLines={1}>{selectedNode.title}</Text>
                <TouchableOpacity
                  onPress={() => { setSelectedNode(null); setSubgraph(null); }}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.detailContent}>{selectedNode.content}</Text>
              <Text style={styles.detailStat}>🔗 {selectedNode.connectionCount} connections</Text>
              <TouchableOpacity
                style={styles.openConceptBtn}
                onPress={() => router.push(`/concept/${selectedNode.id}` as any)}
              >
                <Text style={styles.openConceptBtnText}>Open Concept →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.openConceptBtn, styles.studyBtn]}
                onPress={() => router.push(`/flashcards?conceptId=${selectedNode.id}` as any)}
              >
                <Text style={styles.openConceptBtnText}>📖 Study Flashcards</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/concepts')}
        >
          <Text style={styles.fabText}>✏ Capture Note</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  uiLayer: { ...StyleSheet.absoluteFillObject, paddingTop: SPACING.md },
  workspaceContainer: {
    marginBottom: SPACING.xs,
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
  workspaceChipText: { color: COLORS.gray400, fontSize: FONT.xs },
  workspaceChipTextSelected: { color: COLORS.purpleLight, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: COLORS.white, fontSize: FONT.base },
  fullGraphBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullGraphText: { color: COLORS.gray400, fontSize: FONT.xs },
  refreshBtn: { padding: SPACING.xs },
  searchDropdown: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 240,
    overflow: 'hidden',
  },
  searchDropdownText: { color: COLORS.gray500, fontSize: FONT.sm, padding: SPACING.md, textAlign: 'center' },
  searchResult: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchResultTitle: { color: COLORS.white, fontWeight: '500', fontSize: FONT.sm },
  statsBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statPill: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statPillValue: { color: COLORS.white, fontSize: FONT.xs, fontWeight: '700' },
  statPillLabel: { color: COLORS.gray500, fontSize: FONT.xs },
  subgraphPill: { backgroundColor: COLORS.purpleDim, borderColor: 'rgba(124,58,237,0.35)' },
  subgraphPillText: { color: COLORS.purpleLight, fontSize: FONT.xs },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  overlayText: { color: COLORS.gray400, fontSize: FONT.base },
  detailPanelWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  detailPanel: {
    width: SCREEN_WIDTH * 0.45,
    height: '100%',
    backgroundColor: 'rgba(22, 27, 39, 0.95)',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  detailTitle: { color: COLORS.white, fontWeight: '700', fontSize: FONT.base, flex: 1 },
  closeBtn: { padding: SPACING.xs },
  closeBtnText: { color: COLORS.gray500, fontSize: FONT.md },
  detailContent: { color: COLORS.gray400, fontSize: FONT.xs, lineHeight: 16 },
  detailStat: { color: COLORS.gray500, fontSize: FONT.xs },
  openConceptBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  studyBtn: { backgroundColor: COLORS.greenDim, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', marginTop: SPACING.xs },
  openConceptBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.xs },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,12,30,0.9)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  fabText: { color: '#C4B5FD', fontWeight: '700', fontSize: FONT.sm },
});
