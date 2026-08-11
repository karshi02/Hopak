# Hopak Security-Only Codex Pack

Purpose-built Codex agent pack for `karshi02/Hopak`.

This pack intentionally excludes general product, UI, feature-planning and non-security engineering agents. Every included agent is constrained to defensive security work.

## Install
Copy these two items into the root of your Hopak repository:

- `AGENTS.md`
- `.codex/`

Result:

```text
Hopak/
├── AGENTS.md
└── .codex/
    ├── config.toml
    └── agents/
```

## Example prompts

```text
Use the security agents to audit this repository. Only make defensive security changes. Do not add features or change UI/business logic.
```

```text
Have api-security, auth-security and web-security review the affected code. Fix only verified security issues and add regression tests.
```

```text
Review the payment and webhook flow for signature verification, replay attacks, idempotency, authorization and amount integrity. Do not change business behavior unless required to close a vulnerability.
```

The root `AGENTS.md` is the final scope authority.
