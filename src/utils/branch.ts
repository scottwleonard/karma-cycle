/**
 * Extract the issue number from a community branch name.
 * Supports both "community/123-slug" and "community/issue-123-slug" formats.
 *
 * NOTE: This same regex is used in .github/workflows/preview-comment.yml.
 * If you change it here, update the workflow too (and vice versa).
 */
export function extractIssueNumber(branch: string): number | null {
  const match = branch.match(/^community\/(?:issue-)?(\d+)/);
  return match ? parseInt(match[1]) : null;
}
