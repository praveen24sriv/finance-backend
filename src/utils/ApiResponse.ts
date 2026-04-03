// Standardized response envelope for ALL API responses.
// Consistency here means the frontend can always expect the same shape.
//
// Success:  { success: true,  data: {...},  message: "...", meta?: {...} }
// Error:    { success: false, error: "...", code: "..." }

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;

  constructor(message: string, data?: T, meta?: PaginationMeta) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static ok<T>(message: string, data?: T, meta?: PaginationMeta): ApiResponse<T> {
    return new ApiResponse(message, data, meta);
  }
}