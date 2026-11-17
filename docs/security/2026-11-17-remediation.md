# Security remediation — 17 November 2026

This change addresses SEC-01 through SEC-06 from the security review of revision
`4646fc9`. Each group is implemented in a separate commit.

| Finding | Change | Verification |
| --- | --- | --- |
| SEC-01 | Limit public Hill input to 16 KiB before core processing; use a threadpool; show the matching upload limit | Reject oversized input without invoking core; exact-limit round-trip and response below 512 KiB; browser upload hint |
| SEC-02 | Upgrade certifi to 2026.10.23 | pip-audit against hashed locked dependencies reports no known vulnerabilities |
| SEC-05 | Patch frontend tooling and transitive packages within existing manifest ranges | npm audit reports zero findings; frontend unit tests, build and public browser suite |
| SEC-03 | Add API body idle timeout of 10 seconds and total deadline of 30 seconds | Silent uploads, trickles and disconnects release concurrency slots; a later request succeeds |
| SEC-04 | Add nosniff, frame denial, referrer and permissions policies; hash frontend bootstrap for enforced CSP | Header tests on shell, API rejection and server errors; Chromium blocks an unauthorized inline script while theme and algorithm loading work |
| SEC-06 | Pin external workflow actions by full commit SHA; restrict package-write permission to the image job; enable Dependabot action updates | Resolve tags against each upstream repository and review workflow diffs; actionlint passes; staging exercises the pinned actions |

CSP applies to frontend responses. FastAPI's separate API documentation pages
keep their existing script policy; shared security headers still apply. CSS inline
styles remain allowed because the existing frontend uses inline CSS and dynamic
style attributes. Inline JavaScript is allowed only by a hash computed from the
built HTML when the server starts. Rebuild and restart together when changing it.

No maximum-size load or slow-upload tests were sent to production. Local ASGI tests
verify application deadlines; Render/Cloudflare ingress buffering and deadlines
remain infrastructure details to verify separately. Dependency audit results are
point-in-time checks, now repeated in CI. No changes are made to legacy databases,
private environment files or recovery copies.
