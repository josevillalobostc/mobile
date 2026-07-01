import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import type {
  ConceptDetailResponse,
  ConceptRequest,
  ConceptResponse,
  ConceptUpdateRequest,
  CommentRequest,
  CommentResponse,
  FlashcardCreateRequest,
  FlashcardResponse,
  FlashcardReviewRequest,
  FlashcardStudyResponse,
  GraphResponse,
  NotificationResponse,
  PageResponse,
  StudySessionResponse,
  Tag,
  WorkspaceRequest,
  WorkspaceResponse,
} from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// ─── Request interceptor: inject token from SecureStore ───────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('grove_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // Ignore secure store errors
  }
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// ─── Response interceptor: handle 401 (emit event, let context handle it) ────
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('grove_token').catch(() => {});
      await SecureStore.deleteItemAsync('grove_user').catch(() => {});
      _onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authRegister = (data: { username: string; email: string; password: string }) =>
  api.post('/auth/register', data).then((r) => r.data);

export const authLogin = (data: { username: string; password: string }) =>
  api.post<{ token: string }>('/auth/login', data).then((r) => r.data);

// ─── Users ────────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/users').then((r) => r.data);

// ─── Workspaces ───────────────────────────────────────────────────────────────
export const getPublicWorkspace = () =>
  api.get<PageResponse<WorkspaceResponse>>('/workspaces/public').then((r) => r.data);

export const getWorkspaces = (page = 0, size = 20) =>
  api.get<PageResponse<WorkspaceResponse>>('/workspaces', { params: { page, size } }).then((r) => r.data);

export const getMyWorkspaces = (page = 0, size = 20) =>
  api.get<PageResponse<WorkspaceResponse>>('/workspaces/mine', { params: { page, size } }).then((r) => r.data);

export const getWorkspace = (id: string) =>
  api.get<WorkspaceResponse>(`/workspaces/${id}`).then((r) => r.data);

export const createWorkspace = (data: WorkspaceRequest) =>
  api.post<WorkspaceResponse>('/workspaces', data).then((r) => r.data);

export const updateWorkspace = (id: string, data: WorkspaceRequest) =>
  api.put<WorkspaceResponse>(`/workspaces/${id}`, data).then((r) => r.data);

export const deleteWorkspace = (id: string) =>
  api.delete(`/workspaces/${id}`).then((r) => r.data);

// ─── Graph ────────────────────────────────────────────────────────────────────
export const getPublicGraph = () =>
  api.get<GraphResponse>('/concepts/graph/public').then((r) => r.data);

export const getGraphByWorkspace = (workspaceId: string) =>
  api.get<GraphResponse>('/concepts/graph', { params: { workspaceId } }).then((r) => r.data);

export const getNeighborhoodGraph = (id: string) =>
  api.get<GraphResponse>(`/concepts/${id}/graph`).then((r) => r.data);

// ─── Concepts ─────────────────────────────────────────────────────────────────
export const getConcepts = (page = 0, size = 20, sort = 'title,asc', signal?: AbortSignal) =>
  api.get<PageResponse<ConceptResponse>>('/concepts', { params: { page, size, sort }, signal }).then((r) => r.data);

export const getConcept = (id: string) =>
  api.get<ConceptResponse>(`/concepts/${id}`).then((r) => r.data);

export const getConceptDetail = (id: string) =>
  api.get<ConceptDetailResponse>(`/concepts/${id}/detail`).then((r) => r.data);

export const searchConcepts = (keyword: string, page = 0, size = 20, signal?: AbortSignal) =>
  api.get<PageResponse<ConceptResponse>>('/concepts/search', { params: { keyword, page, size }, signal }).then((r) => r.data);

export const createConcept = (data: ConceptRequest) =>
  api.post<ConceptResponse>('/concepts', data).then((r) => r.data);

export const updateConcept = (id: string, data: ConceptUpdateRequest) =>
  api.put<ConceptResponse>(`/concepts/${id}`, data).then((r) => r.data);

export const deleteConcept = (id: string) =>
  api.delete(`/concepts/${id}`).then((r) => r.data);

export const forkConcept = (id: string, targetWorkspaceId: string) =>
  api.post<ConceptResponse>(`/concepts/${id}/fork`, null, { params: { targetWorkspaceId } }).then((r) => r.data);

export const getConceptsByCluster = (tagId: string, page = 0, size = 50) =>
  api.get<PageResponse<ConceptResponse>>('/concepts/cluster', { params: { tagId, page, size } }).then((r) => r.data);

export const getConceptsByClusterName = (tagName: string, page = 0, size = 50) =>
  api.get<PageResponse<ConceptResponse>>('/concepts/cluster/by-name', { params: { tagName, page, size } }).then((r) => r.data);

export const getLearningPath = (workspaceId: string) =>
  api.get<ConceptResponse[]>('/concepts/learning-path', { params: { workspaceId } }).then((r) => r.data);

export const getAllPrerequisites = (id: string) =>
  api.get<ConceptResponse[]>(`/concepts/${id}/prerequisites`).then((r) => r.data);

export const getRelatedConcepts = (id: string) =>
  api.get<ConceptResponse[]>(`/concepts/${id}/related`).then((r) => r.data);

export const addPrerequisite = (id: string, prereqId: string) =>
  api.post<ConceptResponse>(`/concepts/${id}/prerequisites/${prereqId}`).then((r) => r.data);

export const removePrerequisite = (id: string, prereqId: string) =>
  api.delete<ConceptResponse>(`/concepts/${id}/prerequisites/${prereqId}`).then((r) => r.data);

export const addTagToConcept = (id: string, tagId: string) =>
  api.post<ConceptResponse>(`/concepts/${id}/tags/${tagId}`).then((r) => r.data);

export const removeTagFromConcept = (id: string, tagId: string) =>
  api.delete<ConceptResponse>(`/concepts/${id}/tags/${tagId}`).then((r) => r.data);

export const setConfidenceLevel = (id: string, confidenceLevel: number) =>
  api.put<ConceptDetailResponse>(`/concepts/${id}/confidence`, { confidenceLevel }).then((r) => r.data);

export const addFlashcardToConcept = (id: string, data: FlashcardCreateRequest) =>
  api.post<FlashcardResponse>(`/concepts/${id}/flashcards`, data).then((r) => r.data);

export const getFlashcardsForConcept = (id: string) =>
  api.get<FlashcardResponse[]>(`/concepts/${id}/flashcards`).then((r) => r.data);

// ─── Flashcards ───────────────────────────────────────────────────────────────
export const getStudySession = () =>
  api.get<StudySessionResponse>('/flashcards/session').then((r) => r.data);

export const getSessionByConcept = (conceptId: string) =>
  api.get<StudySessionResponse>(`/flashcards/session/concept/${conceptId}`).then((r) => r.data);

export const reviewFlashcard = (data: FlashcardReviewRequest) =>
  api.post<FlashcardStudyResponse>('/flashcards/review', data).then((r) => r.data);

export const getFlashcards = (page = 0, size = 20) =>
  api.get<PageResponse<FlashcardResponse>>('/flashcards', { params: { page, size } }).then((r) => r.data);

export const deleteFlashcard = (id: string) =>
  api.delete(`/flashcards/${id}`).then((r) => r.data);

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const getTags = (page = 0, size = 100) =>
  api.get<PageResponse<Tag>>('/tags', { params: { page, size } }).then((r) => r.data);

export const createTag = (data: { name: string; color: string }) =>
  api.post<Tag>('/tags', data).then((r) => r.data);

export const deleteTag = (id: string) =>
  api.delete(`/tags/${id}`).then((r) => r.data);

// ─── Comments ─────────────────────────────────────────────────────────────────
export const getConceptComments = (conceptId: string) =>
  api.get<PageResponse<CommentResponse>>(`/comments/concept/${conceptId}`).then((r) => r.data.content);

export const getRootComments = (conceptId: string) =>
  api.get<PageResponse<CommentResponse>>(`/comments/concept/${conceptId}/root`).then((r) => r.data.content);

export const createComment = (data: CommentRequest) =>
  api.post<CommentResponse>('/comments', data).then((r) => r.data);

export const deleteComment = (id: string) =>
  api.delete(`/comments/${id}`).then((r) => r.data);

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = (userId: string) =>
  api.get<NotificationResponse[]>(`/notifications/user/${userId}`).then((r) => r.data);

export const markNotificationRead = (id: string) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data);

export const deleteNotification = (id: string) =>
  api.delete(`/notifications/${id}`).then((r) => r.data);
