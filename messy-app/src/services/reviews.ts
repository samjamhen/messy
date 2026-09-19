import { getAccessToken, saveSession } from './session';
export type Review = {
  id: string;
  subjectId: string;
  restaurantId: string | null;
  restaurantName?: string | null;
  restaurantAddress?: string | null;
  authorId: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type NewReview = Pick<Review, 'rating' | 'body'> & { clientRequestId?: string } & (
  | { restaurantId: string; subjectId?: string }
  | { subjectId: string; restaurantId?: string }
);

export class ReviewApiError extends Error {
  constructor(public readonly status: number) {
    super(`Review request failed (${status})`);
    this.name = 'ReviewApiError';
  }
}

async function request<T>(path: string, method = 'GET', token?: string, body?: unknown): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL;
  if (!baseUrl) throw new Error('Set EXPO_PUBLIC_REVIEW_API_URL in .env.local');
  token ??= await getAccessToken();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401) await saveSession(null);
    throw new ReviewApiError(response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const reviewsApi = {
  resolveRestaurant(googlePlaceId: string, accessToken: string) {
    return request<{ id: string; name: string; address: string }>('/restaurants/from-google', 'POST', accessToken, { googlePlaceId });
  },
  list(subjectId?: string, limit = 20, offset = 0) {
    return request<{ items: Review[] }>(`/reviews?limit=${limit}&offset=${offset}${subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ''}`);
  },
  create(review: NewReview, accessToken: string) {
    return request<Review>('/reviews', 'POST', accessToken, review);
  },
  update(id: string, changes: Partial<Pick<Review, 'rating' | 'body'>>, accessToken: string) {
    return request<void>(`/reviews/${encodeURIComponent(id)}`, 'PATCH', accessToken, changes);
  },
  delete(id: string, accessToken: string) {
    return request<void>(`/reviews/${encodeURIComponent(id)}`, 'DELETE', accessToken);
  },
};
