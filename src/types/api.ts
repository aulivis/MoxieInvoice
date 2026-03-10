/**
 * Central API response types for consistent frontend handling.
 */

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function isApiError(res: ApiResponse): res is ApiError {
  return res && typeof (res as ApiError).success === 'boolean' && (res as ApiError).success === false;
}
