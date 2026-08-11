# Hopak — SECURITY ONLY

## Absolute Scope
This repository is restricted to defensive security work only.

You may inspect, modify, test, or document code only when the primary purpose is to prevent, detect, contain, or remediate a security, abuse, privacy, authentication, authorization, integrity, or availability risk.

## Allowed
- Authentication / authorization hardening
- JWT, session, cookie, refresh-token and API-token security
- Password hashing, password reset, OTP/MFA security
- RBAC/permissions and privilege-boundary enforcement
- Input validation / sanitization
- SQLi, XSS, CSRF, SSRF, command injection, path traversal, prototype pollution and related defenses
- API validation, CORS, origin controls, rate limiting, anti-abuse and replay protection
- Payment/webhook signature verification, idempotency and transaction-integrity defenses
- File upload safety
- Secrets and environment-variable protection
- CSP, HSTS, secure headers, TLS and secure cookie settings
- Dependency vulnerability remediation
- Docker, reverse proxy, CI/CD and server hardening when security-related
- Audit logging, security monitoring and incident-response support
- Encryption, sensitive-data exposure prevention and privacy controls
- Security tests, regression tests, threat modeling and defensive review

## Forbidden
Do not perform work whose main purpose is outside security. This includes:
- New features or feature expansion
- UI/UX redesign or cosmetic changes
- Marketing, SEO, analytics or content work
- Business-rule changes
- Booking, pricing, room, hotel or user-flow changes unrelated to a security fix
- General refactors, cleanup, renaming or formatting
- Performance optimization unless needed for availability/abuse defense
- Database/API redesign unrelated to security
- Dependency upgrades only for modernization or features
- Architecture rewrites unrelated to a verified security need

## Minimal Change Rule
If a security fix requires touching non-security code, make the smallest possible change and preserve existing behavior unless that behavior is itself insecure.

## Mandatory Decision Gate
Before editing any file, answer internally:
"Is this change necessary for a concrete defensive security objective?"
If no, do not edit it.

## Verification
For every security change, where practical:
1. State the threat/vulnerability.
2. Identify the trust boundary / attack surface.
3. Apply the smallest effective fix.
4. Add or update a security regression test.
5. Verify legitimate behavior still works.
6. Avoid new dependencies unless security requires them.

## Stop Condition
If the requested task is not security-related, stop and state that it is outside this repository's permitted scope.
