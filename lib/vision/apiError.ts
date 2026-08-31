export function anthropicErrorResponse(error: unknown): Response {
  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Failed to call the Anthropic API",
    },
    { status: 502 }
  );
}
