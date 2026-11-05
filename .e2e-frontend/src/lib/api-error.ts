/** Read the backend's useful error message without exposing HTML or server details. */
export async function apiError(response: Response, fallback: string): Promise<Error> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return new Error(body.message);
    }
  } catch {
    // Gateways sometimes return HTML instead of the API's JSON response.
  }
  return new Error(`${fallback} (HTTP ${response.status}).`);
}
