export const SYSTEM_SECTIONS = [
  '## Scope',
  '## Architecture alignment',
  '## Testability risks',
  '## Cross-RF coverage strategy',
  '## Shared fixtures and data',
  '## Non-functional focus',
  '## Open questions'
];

export const PROPOSAL_SECTIONS = [
  '## Official RF ID',
  '## Scope',
  '## Proposed tests',
  '## Existing tests to reuse',
  '## Existing tests requiring modification',
  '## New tests to create',
  '## Ambiguities requiring user decision',
  '## Approval request'
];

function hasSection(content, heading) {
  return String(content || '').includes(heading);
}

export function validateTestDesignSystem(content, options = {}) {
  const errors = [];
  const text = String(content || '').trim();
  if (!text) {
    errors.push('System test design file is empty.');
    return { ok: false, errors };
  }
  if (!/^#\s+/.test(text)) {
    errors.push('System test design must start with a top-level heading (# Title).');
  }
  for (const section of SYSTEM_SECTIONS) {
    if (!hasSection(text, section)) {
      errors.push(`Missing section: ${section}`);
    }
  }
  if (options.requireRfReference && !/RF-\d+/i.test(text)) {
    errors.push('System test design should reference at least one RF ID when requirements exist.');
  }
  return { ok: errors.length === 0, errors };
}

export function validateTestDesignProposal(content, options = {}) {
  const errors = [];
  const text = String(content || '').trim();
  if (!text) {
    errors.push('Per-RF test design proposal is empty.');
    return { ok: false, errors };
  }
  if (!/^#\s+/.test(text)) {
    errors.push('Test design proposal must start with a top-level heading (# Title).');
  }
  for (const section of PROPOSAL_SECTIONS) {
    if (!hasSection(text, section)) {
      errors.push(`Missing section: ${section}`);
    }
  }
  if (options.requireOfficialRfId && !/RF-\d+/i.test(text)) {
    errors.push('Per-RF test design must mention the official RF ID before final .feature generation.');
  }
  return { ok: errors.length === 0, errors };
}
