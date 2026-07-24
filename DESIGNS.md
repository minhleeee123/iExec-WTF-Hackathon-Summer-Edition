# NoxSwap Design System

> Status: Canonical UI/UX reference for the Phase 6 production interface.
> Updated: 2026-07-24.

This document defines the visual language, information architecture, interaction
rules, responsive behavior, and privacy-aware UX conventions used by NoxSwap.
New interface work should follow this reference unless a deliberate redesign is
approved and documented.

## 1. Product experience goals

NoxSwap should feel like a production trading application without hiding the
technical boundaries of confidential execution.

The interface must:

- Separate public, confidential, personal-wallet, and Safe-owned state.
- Make every transaction authority explicit before a signature is requested.
- Keep the shortest path from a fresh wallet to a protected trade discoverable.
- Present real Sepolia state without mock success or fake balances.
- Preserve the same interaction grammar across personal and Safe workflows.
- Remain usable with keyboard navigation and at widths down to 320px.
- Explain privacy precisely without claiming FHE, zero MEV, or fully local
  encryption.

## 2. Information architecture

### Public surfaces

- `/`: product value, capabilities, onboarding, privacy boundaries, Safe
  composability, FAQ, and launch actions.
- `/docs`: operational documentation with a scroll-synchronized table of
  contents.

Generic `Launch app`, `Open the app`, and `Launch NoxSwap` actions start at
`/app/wallet`. Capability-specific links may deep-link to their relevant
workflow.

### Application workspaces

The canonical navigation order is:

1. `Wallet` — assets and selective access.
2. `Trade` — protected swaps, confidential limit orders, and Strategy Agent.
3. `Activity` — personal history, receipts, and verification evidence.
4. `Safe Treasury` — smart-account-owned confidential operations.

Personal custody and Safe custody must never be merged into one tab. A connected
EOA signs Safe owner actions, but the Safe owns its balances.

### Safe Treasury sections

Safe Treasury uses the same visual and interaction patterns as the personal
workspaces:

- `Swap & unwrap`
- `Orders & Agent`
- `Activity`
- `Access & security`

The compact Safe header carries identity, owner threshold, module state,
balances, reveal, and funding. Do not restore a redundant Overview page.

## 3. Visual language

The visual direction is technical neo-brutalism: strong black structure, compact
monospace evidence, bright functional accents, visible state boundaries, and
minimal decorative softness.

### Color tokens

| Token | Value | Primary use |
|---|---|---|
| `--ink` | `#080808` | Text, borders, dark surfaces |
| `--paper` | `#f1f2f4` | Application background |
| `--white` | `#ffffff` | Cards and content surfaces |
| `--purple` | `#8050e8` | Brand, active navigation, primary launch CTA |
| `--lime` | `#a3e635` | Live/verified accents and success contrast |
| `--pink` | `#f472b6` | Primary transaction actions |
| `--yellow` | `#fcd34d` | Attention, focus, faucet, and helper states |
| `--red` / `--danger` | `#d32652` | Validation and destructive warnings |
| `--muted` | `#62636a` | Secondary copy |
| `--line` | `#c9cbd0` | Internal separators |
| `--soft-purple` | `#eee9ff` | Selected/ informational surfaces |
| `--soft-lime` | `#efffcf` | Success and low-risk guidance |

Use color together with labels or icons. Color alone must not communicate
authorization, privacy, success, or failure.

### Typography

- Primary: `Space Grotesk`, weights 400–700.
- Technical/evidence: `Space Mono`, weights 400 and 700.
- Display headings are bold, tight, and often uppercase.
- Eyebrows, handles, transaction metadata, and compact status labels use
  monospace.
- Body copy should remain readable and should not use low-contrast gray below
  `--muted`.

### Shape and depth

- Standard border: 2px solid `--ink`.
- Standard radius: 7–8px.
- Standard card shadow: `4px 4px 0 --ink`.
- Compact controls may use a 1px border and 4–5px radius.
- Hovering a primary control compresses its offset shadow instead of using
  decorative glow.

### Background

Application pages use a 24px technical grid over `--paper`. Cards remain white
or use a semantic soft accent. Avoid gradients that obscure text or imply state.

## 4. Layout system

### Desktop

- Application shell: 276px persistent sidebar plus a fluid content region.
- Standard content maximum: 1120–1200px.
- Page heading: title, concise operational description, and optional status
  aside.
- Main cards use a clear one- or two-column hierarchy and never depend on fixed
  content height.

### Mobile and tablet

Primary breakpoint: `900px`.

- Desktop sidebar becomes a fixed top header, wallet drawer, and four-item
  bottom navigation.
- Multi-column workflow layouts collapse to one column.
- Wallet and dialog content must scroll vertically without horizontal overflow.
- Bottom navigation labels remain `Wallet`, `Trade`, `Activity`, and `Safe`.

Compact breakpoint: `640px`.

- Page headings stack.
- Tabs distribute across available width.
- Forms, evidence grids, and documentation cards collapse without truncating
  required actions.

All pages must support at least 320px width. Interactive targets should normally
be at least 38–42px high.

## 5. Navigation and workspace patterns

- Active primary navigation uses a purple surface, black border, and offset
  shadow.
- Workflow tabs use `role="tab"`, `aria-selected`, and a labelled tab panel.
- Tabs support Arrow keys, Home, and End where the shared workflow pattern is
  used.
- Browser URLs preserve the selected workflow, order filter, order detail, and
  Safe section.
- `Activity` appears before `Safe Treasury` on desktop and mobile.
- Documentation TOC state follows scrolling and updates immediately after an
  anchor selection.

## 6. Wallet balance hierarchy

The persistent wallet panel presents balances in this order:

1. Sepolia ETH for gas.
2. Public faucet-backed `n-assets`.
3. Confidential ERC-7984 `c-assets`.

`nUSDC`, `nWETH`, `nWBTC`, and `nSOL` are always listed. Public and confidential
tokens use the same row-based token/value structure so they are easy to compare.
Group labels and privacy controls distinguish their state.

The reveal eye belongs to the `Confidential assets` heading because it affects
only c-asset plaintext visibility. Refresh remains a wallet-wide action.

Rules:

- Disconnected balances display an em dash, not a fabricated zero.
- Public balances are immediately readable after chain refresh.
- Confidential balances display bullets until authorized.
- Plaintext confidential balances remain session-only.
- Faucet and wrap actions stay in the Wallet workspace, not in the sidebar.
- The same balance hierarchy appears inside the mobile wallet drawer.

## 7. Transaction forms

Transaction forms follow this sequence:

1. Operation or pair selection.
2. Available balance.
3. Amount.
4. Privacy/protection parameters.
5. Plain-language consequence or warning.
6. One primary transaction action.

Protected swap forms expose:

- Input and output assets.
- Encrypted minimum received.
- Chainlink reference and tolerance.
- Public deadline.
- Explicit zero-minOut acknowledgement when applicable.

Validation appears before wallet confirmation. A mined transaction must not be
reported as failed solely because post-confirmation decryption or indexing is
delayed.

## 8. Safe custody UX

Safe interfaces must continuously reinforce:

- The connected wallet is a signer.
- The Safe owns the assets.
- The Nox module is allowlisted and restricted.
- Module revoke pauses supported operations without moving balances or changing
  Safe owners.

Safe-specific cards may describe custody or module state, but operational
controls must reuse the original swap, order, activity, segmented-tab, and
history patterns.

Never present a 1-of-1 browser demo as a complete multi-owner signing client.
Higher-threshold execution belongs in the Safe Wallet interface.

## 9. Feedback and system state

- Success: soft lime.
- Informational or recoverable waiting state: soft purple.
- Validation/destructive warning: red or light red.
- Faucet cooldown and time-sensitive attention: yellow.
- Busy actions replace the relevant icon with a spinner and disable duplicate
  submission.

Notices live in document flow above page content so they never cover headings or
controls.

Empty states must explain what is absent and, where useful, the action needed to
create data. Do not use fake transactions or balances to fill an empty state.

## 10. Dialogs, drawers, and focus

- Dialogs use `role="dialog"` and `aria-modal="true"`.
- Focus moves inside on open and returns to the trigger on close.
- Escape closes non-destructive dialogs and drawers.
- Background scrolling is locked while a modal is active.
- The mobile wallet is a right-side drawer with its own vertical overflow.
- Order details preserve public/private permission boundaries: executors never
  receive owner-only reveal controls.

## 11. Accessibility

- Every icon-only control needs an accessible name and tooltip/title where
  helpful.
- Keyboard focus uses a 3px black outline plus a yellow outer ring.
- Reduced-motion preference disables smooth scrolling, long transitions, and
  repeated animation.
- Text and action contrast must remain readable on all semantic surfaces.
- Do not remove focus outlines.
- Do not encode success, failure, privacy, or authorization through color alone.
- Desktop and mobile must have zero page-level horizontal overflow.

The Phase 6 production build reached Lighthouse Accessibility 100. New work must
not lower the accessible-name, focus, contrast, or keyboard-navigation coverage
that produced that result.

## 12. Content conventions

Use precise vocabulary:

- `Public asset` for faucet-backed n-assets.
- `Confidential asset` for ERC-7984 c-assets.
- `Reveal` for an authorized session-only plaintext read.
- `Protected swap` for encrypted amount/minOut settlement.
- `Safe owner` or `connected signer`, not Safe custodian.
- `Chainlink reference`, not AI price.
- `Strategy draft`, not autonomous trade.

Avoid unsupported claims:

- No FHE claim.
- No zero-MEV guarantee.
- No claim that encryption is entirely local; the Handle flow uses the Nox
  Gateway.
- No claim that the Strategy Agent signs or settles transactions.
- No production-value or mainnet wording for faucet assets.

## 13. Component ownership

| Pattern | Canonical implementation |
|---|---|
| App shell and primary navigation | `apps/web/src/components/AppSidebar.jsx` |
| Wallet balances | `apps/web/src/components/PrivateWallet.jsx` |
| Page heading | `apps/web/src/components/PageHeading.jsx` |
| Protected swap | `apps/web/src/components/SwapPanel.jsx` |
| Limit-order form | `apps/web/src/components/LimitOrderForm.jsx` |
| Orderbook/detail | `apps/web/src/components/OrderBook.jsx`, `OrderDetail.jsx` |
| Activity/history | `apps/web/src/components/ActivitySection.jsx` |
| Safe workflows | `apps/web/src/pages/SafePage.jsx`, `components/SafeTreasury.jsx` |
| Landing and docs | `apps/web/src/pages/LandingPage.jsx`, `DocsPage.jsx` |
| Visual tokens and responsive rules | `apps/web/src/App.css`, `index.css` |
| Responsive regression checks | `apps/web/scripts/check-ui.mjs` |

Prefer extending these patterns over creating visually parallel components.

## 14. Design review checklist

Before merging a UI change, verify:

- The custody owner and signing authority are unambiguous.
- Public and confidential values cannot be confused.
- Loading, empty, error, rejected, refunded, and success states are covered.
- The action remains understandable without relying on icon or color alone.
- Keyboard focus and tab semantics work.
- Desktop at 1440/1280px and mobile at 390px have no horizontal overflow.
- Mobile drawers and dialogs remain scrollable and closable.
- Existing personal and Safe functionality has not been removed.
- Generic launch actions still start in Wallet.
- Source claims match the actual Nox, Safe, Chainlink, and Agent boundaries.
- `npm run lint`, `npm run build`, and `npm run test:ui` pass.
