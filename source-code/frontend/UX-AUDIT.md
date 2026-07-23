# NoxSwap Frontend UI/UX Audit

Audit date: 2026-07-23
Scope: landing page, app shell, wallet, protected swap, limit orders, Strategy Agent, activity/evidence, mobile drawer, dialogs, responsive behavior, and keyboard/accessibility states.

## Baseline

- 41 frontend unit tests passed.
- Oxlint and production Vite build passed.
- Playwright smoke checks passed at `1440x1000`, `390x844`, and two wallet/permission scenarios.
- No horizontal overflow was found in landing, trade, wallet, activity, agent, orderbook, or order detail views.

## Findings and remediation

| Priority | Finding | Remediation |
|---|---|---|
| High | Modal and mobile drawer had no focus placement, focus trap, background scroll lock, or consistent Escape handling. | Added shared `useDialogFocus` behavior to wallet, guide, proof, receipt, order-detail, and mobile-wallet dialogs. |
| High | Workflow tabs used partial ARIA semantics and did not support keyboard tab navigation. | Added `aria-controls`, `tabpanel`, roving `tabIndex`, and Arrow/Home/End keyboard navigation with focus transfer. |
| High | Wallet availability warning only checked `window.ethereum`, which misses EIP-6963-only providers. | Added provider announcement detection and corrected the copy to “compatible wallet”. |
| High | A connected user could not change wallet provider without reloading; provider identity was not visible. | Added persisted provider preference, provider-aware reconnect, visible provider label, and a Change action. |
| Medium | Changing orderbook filters could leave the user on an empty later page. | Filter/sort changes now reset pagination to page 1 while detail navigation preserves the current page. |
| Medium | Copy order-link action had no success feedback. | Added temporary copied state, check icon, and accessible status label. |
| Medium | Theme purple and error red failed normal-text contrast in common controls; `--danger` was undefined. | Updated shared color tokens to AA-safe values and defined `--danger`. |
| Medium | Motion preferences were not honored. | Added `prefers-reduced-motion` overrides for animation, transition, and smooth scrolling. |
| Low | UI regression coverage did not assert dialog focus/scroll behavior or tab semantics. | Extended Playwright checks for selected tab semantics, dialog focus, Escape close, and scroll restoration. |

## Deliberately not redesigned

The existing neo-brutalist visual language is coherent across landing and app surfaces, so a full redesign would add risk without improving the core flow. The audit therefore keeps the visual system and improves interaction quality, accessibility, contrast, and recoverability.

## Remaining product-level considerations

- Exact encrypted-pool quotes cannot be shown as plaintext without changing the privacy model. The UI continues to disclose that Chainlink tolerance is a protection reference and that pool price impact can still cause a confidential refund.
- The dApp remains testnet software and should continue to display the external-audit/testnet disclaimer.
- A formal automated axe/Lighthouse run and external smart-contract/security audit remain useful follow-ups for a production release, but are outside this repository's current test harness.
