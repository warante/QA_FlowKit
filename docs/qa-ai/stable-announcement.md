# Stable announcement (TASK-086)

Machine-readable record: [`stable-announcement.v1.json`](stable-announcement.v1.json).  
Public entrypoint flip list: [`stable-public-entrypoints.v1.json`](stable-public-entrypoints.v1.json).

**Status:** `prepared` (README and SECURITY still describe **Release Candidate** until TASK-085 completes)

## When to run

After TASK-085 post-publish verification is `completed` and `qa-flowkit@1.0.0` is on npm `latest`.

## Maintainer checklist

1. Publish announcement from [`stable-announcement.template.md`](stable-announcement.template.md) (GitHub Release, discussion or issue).
2. Apply flip list in `stable-public-entrypoints.v1.json` to README, README.es, SECURITY and stability policy.
3. Replace `docs/qa-ai/stability-policy.md` content with [`stability-policy-stable.md`](stability-policy-stable.md) (or merge equivalent edits).
4. Run `npm run docs:check` after lifecycle text changes (update documentation-consistency rules if needed).
5. Notify pilot participants; invite feedback via [stable-feedback.yml](../../.github/ISSUE_TEMPLATE/stable-feedback.yml).
6. Set `stable-announcement.v1.json` → `status: published` and `stable-public-entrypoints.v1.json` → `lifecycle: stable`.

## Verification

```bash
npm run test:stable-announcement
npm run test:stable-announcement:unit
```

## Claims policy

Do **not** add unsupported productivity, security or quality guarantees in public copy. The announcement template
includes an explicit limitations section.
