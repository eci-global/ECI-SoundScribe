export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

/**
 * Create a standardized error response with proper CORS headers
 */
export function createErrorResponse(
  error: string | Error,
  status: number = 500,
  additionalData?: Record<string, any>
): Response {
  const errorMessage = error instanceof Error ? error.message : error;
  
  const responseBody = {
    success: false,
    error: errorMessage,
    ...additionalData
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

/**
 * Create a standardized success response with proper CORS headers
 */
export function createSuccessResponse(
  data: any,
  status: number = 200
): Response {
  const responseBody = {
    success: true,
    ...data
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

/**
 * Handle CORS preflight requests
 */
export function handleCORSPreflight(): Response {
  return new Response(null, { 
    headers: corsHeaders,
    status: 200
  });
}