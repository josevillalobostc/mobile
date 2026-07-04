export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ConceptResponse {
  id: string;
  title: string;
  content: string;
  tags: Tag[];
  tagIds: string[];
  workspaceId: string;
  connectionCount: number;
  prerequisiteIds: string[];
  prerequisiteTitles: string[];
}

export interface ConceptDetailResponse {
  id: string;
  title: string;
  content: string;
  tags: Tag[];
  connectionCount: number;
  confidenceLevel: number | null;
  prerequisiteIds: string[];
  prerequisiteTitles: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  tagIds: string[];
  workspaceId: string;
  connectionCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface FlashcardStudyResponse {
  id: string;
  front: string;
  back: string;
  hint: string;
  difficulty: number;
  conceptId: string;
  conceptTitle: string;
  conceptTag: string;
  interval: number;
  easeFactor: number;
  nextReviewAt: string;
  reviewCount: number;
}

export interface StudySessionResponse {
  total: number;
  flashcards: FlashcardStudyResponse[];
}

export interface FlashcardResponse {
  id: string;
  front: string;
  back: string;
  hint: string;
  difficulty: number;
  conceptId: string;
}

export interface FlashcardCreateRequest {
  front: string;
  back: string;
  hint?: string;
  difficulty: number;
}

export interface FlashcardReviewRequest {
  flashcardId: string;
  rating: 1 | 2 | 3 | 4;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
}

export interface WorkspaceRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface ConceptRequest {
  title: string;
  content: string;
  workspaceId: string;
}

export interface ConceptUpdateRequest {
  title?: string;
  content?: string;
}

export interface CommentResponse {
  id: string;
  content: string;
  authorUsername: string;
  authorId: string;
  conceptId: string;
  parentId: string | null;
  createdAt: string;
  replies?: CommentResponse[];
}

export interface CommentRequest {
  content: string;
  conceptId: string;
  parentId?: string | null;
}

export interface NotificationResponse {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type ConfidenceBadge = 'NOT_STARTED' | 'LEARNING' | 'REVIEWING' | 'HIGH' | 'MASTERED' | null;

export function getConfidenceBadge(level: number | null): ConfidenceBadge {
  if (level === null) return null;
  if (level === 0) return 'NOT_STARTED';
  if (level <= 33) return 'LEARNING';
  if (level <= 66) return 'REVIEWING';
  if (level <= 99) return 'HIGH';
  return 'MASTERED';
}
