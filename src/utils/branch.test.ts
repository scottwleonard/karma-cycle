import { describe, it, expect } from 'vitest';
import { extractIssueNumber } from './branch';

describe('extractIssueNumber', () => {
  it('parses community/{number}-slug format', () => {
    expect(extractIssueNumber('community/27-green-buttons')).toBe(27);
  });

  it('parses community/issue-{number}-slug format', () => {
    expect(extractIssueNumber('community/issue-27-green-buttons')).toBe(27);
  });

  it('parses branch with no slug', () => {
    expect(extractIssueNumber('community/42')).toBe(42);
    expect(extractIssueNumber('community/issue-42')).toBe(42);
  });

  it('returns null for non-community branches', () => {
    expect(extractIssueNumber('main')).toBeNull();
    expect(extractIssueNumber('feature/add-voting')).toBeNull();
    expect(extractIssueNumber('claude/enable-ipad')).toBeNull();
  });

  it('returns null for malformed community branches', () => {
    expect(extractIssueNumber('community/')).toBeNull();
    expect(extractIssueNumber('community/no-number')).toBeNull();
  });
});
