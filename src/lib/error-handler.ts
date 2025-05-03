import { toast } from "@/hooks/use-toast";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Error details interface for structured error handling
 */
interface ErrorDetails {
  title?: string;
  message: string;
  technical?: string;
  errorCode?: string;
  action?: string;
}

/**
 * Interface for Supabase storage errors
 */
interface StorageError {
  statusCode?: number;
  message?: string;
  error?: string;
}

/**
 * Standardized error handler for application-wide consistent error handling
 * 
 * @param error The error object (any type)
 * @param customDetails Optional custom error details to override defaults
 */
export function handleError(error: unknown, customDetails?: Partial<ErrorDetails>): void {
  // Default error details
  let details: ErrorDetails = {
    title: "Error",
    message: "An unexpected error occurred.",
    technical: error instanceof Error ? error.message : String(error),
    action: "Please try again later."
  };
  
  // Process specific error types
  if (error instanceof Error) {
    details.message = error.message;
  }
  
  // Handle Supabase PostgrestError
  if (isPostgrestError(error)) {
    const pgError = error as PostgrestError;
    details = {
      ...details,
      title: "Database Error",
      message: getReadablePostgrestError(pgError),
      errorCode: pgError.code,
      technical: `${pgError.code}: ${pgError.message} ${pgError.details ? `(${pgError.details})` : ''}`
    };
  }
  
  // Handle storage errors (they have a different structure)
  if (isStorageError(error)) {
    const storageError = error as StorageError;
    details = {
      ...details,
      title: "Storage Error",
      message: "Failed to upload or access file",
      errorCode: storageError.statusCode?.toString() || "STORAGE_ERROR",
      technical: storageError.message || storageError.error || JSON.stringify(storageError)
    };
  }
  
  // Override with custom details if provided
  if (customDetails) {
    details = { ...details, ...customDetails };
  }
  
  // Log detailed error to console for debugging
  console.error("Error details:", {
    error,
    details
  });
  
  // Show user-friendly toast notification
  toast({
    title: details.title,
    description: details.message,
    variant: "destructive"
  });
}

/**
 * Type guard for PostgrestError
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' && 
    error !== null && 
    'code' in error && 
    'message' in error &&
    'details' in error
  );
}

/**
 * Type guard for Supabase storage errors
 */
function isStorageError(error: unknown): error is StorageError {
  return (
    typeof error === 'object' && 
    error !== null && 
    ('statusCode' in error || 'error' in error || 'message' in error)
  );
}

/**
 * Convert PostgrestError to user-friendly message
 */
function getReadablePostgrestError(error: PostgrestError): string {
  switch (error.code) {
    case "PGRST116": 
      return "The requested resource was not found.";
    case "23505": 
      return "This item already exists.";
    case "23503": 
      return "This operation can't be completed because the item is referenced by another resource.";
    case "42P01": 
      return "The requested data table doesn't exist.";
    case "42501": 
      return "You don't have permission to perform this action.";
    case "22P02": 
      return "Invalid input format.";
    case "PGRST301": 
      return "Your request was invalid.";
    default:
      return `Database error: ${error.message}`;
  }
}