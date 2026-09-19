export type Review = {
  id: string;
  subjectId: string;
  restaurantId: string | null;
  authorId: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type NewReview = Pick<Review, 'rating' | 'body'> & (
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
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new ReviewApiError(response.status);
  return response.status === 204 ? undefined as T : response.json();
}

export const reviewsApi = {
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
