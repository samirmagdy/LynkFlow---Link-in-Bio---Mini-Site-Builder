export function reportRecoverableError(operation: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[LynkFlow] ${operation}: ${detail}`);
}
