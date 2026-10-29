export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export type ConnectionStatus = 'ok' | 'stale' | 'error' | 'unknown';

export interface HealthStatus {
  status: ConnectionStatus;
  sheets_connected: boolean;
  last_successful_read?: string;
  last_successful_write?: string;
}
