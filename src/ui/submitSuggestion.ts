export interface SuggestionMatch {
  number: number;
  title: string;
  url: string;
}

export interface SuggestionResult {
  success: boolean;
  message: string;
  duplicate?: boolean;
  matches?: SuggestionMatch[];
}

export async function submitSuggestion(
  text: string,
  loadTime: number,
): Promise<SuggestionResult> {
  try {
    const res = await fetch('/.netlify/functions/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion: text, t: loadTime }),
    });
    return (await res.json()) as SuggestionResult;
  } catch {
    return { success: false, message: 'Network error — try again later.' };
  }
}
