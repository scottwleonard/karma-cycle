export async function submitSuggestion(
  text: string,
  loadTime: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/.netlify/functions/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion: text, t: loadTime }),
    });
    return (await res.json()) as { success: boolean; message: string };
  } catch {
    return { success: false, message: 'Network error — try again later.' };
  }
}
