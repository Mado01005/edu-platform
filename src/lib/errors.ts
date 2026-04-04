/**
 * Standardized error handling utilities for API routes
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  details?: string[];
  status: number;
}

/**
 * Standard error response format
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: string[]
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      details,
      status,
    },
    { status }
  );
}

/**
 * Standard success response format
 */
export function createSuccessResponse<T = any>(
  data: T,
  status: number = 200
): NextResponse<{ success: true; data: T }> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Common error types with consistent messages
 */
export const ApiErrors = {
  // Authentication errors
  UNAUTHORIZED: () => createErrorResponse('Unauthorized', 401),
  FORBIDDEN: () => createErrorResponse('Forbidden', 403),
  
  // Validation errors
  INVALID_INPUT: (details?: string[]) => 
    createErrorResponse('Invalid input', 400, details),
  MISSING_PARAMETER: (param: string) => 
    createErrorResponse(`Missing required parameter: ${param}`, 400),
  
  // Resource errors
  NOT_FOUND: (resource: string) => 
    createErrorResponse(`${resource} not found`, 404),
  CONFLICT: (message: string) => 
    createErrorResponse(`Conflict: ${message}`, 409),
  
  // Server errors
  INTERNAL_ERROR: (message?: string) => 
    createErrorResponse(message || 'Internal Server Error', 500),
  DATABASE_ERROR: (message: string) => 
    createErrorResponse(`Database error: ${message}`, 500),
};

/**
 * Safe database error handler that doesn't expose raw errors
 */
export function handleDatabaseError(error: unknown): NextResponse<ApiError> {
  console.error('Database error:', error);
  
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected database error occurred';
    
  return ApiErrors.DATABASE_ERROR(message);
}

/**
 * Safe input validation wrapper
 */
export function validateInput<T>(
  input: T,
  validator: (input: T) => { isValid: boolean; errors?: string[] }
): NextResponse<ApiError> | null {
  const result = validator(input);
  if (!result.isValid) {
    return ApiErrors.INVALID_INPUT(result.errors);
  }
  return null;
}