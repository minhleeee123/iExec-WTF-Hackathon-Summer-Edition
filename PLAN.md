# Master Plan

> Trạng thái ban đầu: Workspace handoff đang được chuẩn bị
> File này điều phối tiến độ. Không sao chép deadline, requirements hoặc rubric vào đây.

## 1. Trạng thái hiện tại

- Giai đoạn hiện tại: Phase 6 — Final UI/UX and rubric audit
- Trạng thái: In progress
- Bước tiếp theo: Align Safe Treasury with the established Trade, Wallet, and Activity interaction patterns, then complete the Phase 6 rubric and regression audit.
- Blocker hiện tại: Không có blocker kỹ thuật. Direct Safe faucet, owner execute-order, and browser multisig remain explicitly out of scope.
- Đang chờ phê duyệt từ: Không.
- Cập nhật lần cuối: 2026-07-24T14:10:00+07:00

Trạng thái phase được phép dùng: `Todo`, `In progress`, `Waiting for approval`, `Blocked`, `Completed`, `Skipped`.

## 2. Nguồn canonical

| Nội dung | File canonical |
|---|---|
| Tổng quan và Participation Fit Gate | `docs/competition-summary.md` |
| Bản tóm tắt tiếng Việt | `docs/competition-summary-vi.md` |
| Requirements và submission checklist | `docs/requirements.md` |
| Rubric và trọng số | `docs/judging-criteria.md` |
| Source Register, deadline, xung đột và thông tin chưa xác minh | `docs/important-notes.md` |

## 3. Execution Plan

| Phase | Input | Công việc | Output | Approval Gate | Trạng thái |
|---|---|---|---|---|---|
| 0. Workspace handoff | Tài liệu cuộc thi | Lưu nguồn, chuẩn hóa context và khởi tạo plan | Workspace hợp lệ | Người dùng kiểm tra handoff | Completed |
| 1. Context verification | Năm file trong `docs/` | Giải quyết thông tin chưa rõ có ảnh hưởng lớn | Context đủ để ra quyết định | Người dùng xác nhận | Completed |
| 2. Research | Context đã xác minh | Nghiên cứu người dùng, sản phẩm tương tự và benchmark theo rubric | Evidence Log, competitor/rubric benchmark và research handoff | Không | Completed |
| 3. Brainstorm | Research output | Hard gate, rubric scoring và shortlist | Ý tưởng được chọn | Người dùng chọn ý tưởng | Completed |
| 4. Product Plan | Ý tưởng được chọn | Hoàn thiện `plan/product-plan.md` | MVP, non-goals và demo scenario | Người dùng phê duyệt | Completed |
| 5. Build Plan | Product Plan đã duyệt | Hoàn thiện `plan/build-plan.md` | Stack, kiến trúc, timeline và backlog | Người dùng phê duyệt | Completed |
| 6. Development | Build Plan đã duyệt | Hoàn thiện core product, vượt Core Product Ready Gate, triển khai Sepolia | Demo-ready application và landing page | Milestone verification | In progress |
| 7. Submission | Demo-ready application và landing page | Hoàn thiện mọi deliverable bắt buộc | Bài nộp hoàn chỉnh | Người dùng final review | Todo |

## 4. Approval Log

| Gate | Quyết định | Người xác nhận | Thời điểm | Bằng chứng hoặc ghi chú |
|---|---|---|---|---|
| Participation Fit | Approved | User | 2026-07-21T21:34:36+07:00 | Challenge yêu cầu functional front-end, end-to-end accessibility, ETH Sepolia deploy, UX và iExec Nox integration. |
| Context verification | Approved | User | 2026-07-22T10:43:00+07:00 | Đã xác nhận chi tiết deadline chính thức từ người dùng (Hạn chót 02/08/2026) và trọng số sao của rubric. |
| Idea selection | Approved | User | 2026-07-22T10:46:53+07:00 | Đã chọn Option 1: NoxSwap — Confidential Liquidity & Swap Router. |
| Product Plan | Approved | User | 2026-07-22T10:56:00+07:00 | Người dùng đã xem xét và đồng ý thực hiện Product Plan cho NoxSwap. |
| Build Plan | Approved | User | 2026-07-22T10:56:30+07:00 | Phê duyệt Build Plan cho ứng dụng NoxSwap. |
| Core Development & Sepolia Deploy | Reopened | User | 2026-07-22 | Audit xác định deployment cũ không dùng Nox SDK/TEE thật; người dùng yêu cầu remediation và cho phép redeploy bằng ví test. |
| Safe Treasury parity extension | Approved | User | 2026-07-24T00:10:25+07:00 | Implement in order: configurable Safe swap tolerance/deadline, Safe activity, draft-only Safe Strategy Agent, and Safe unwrap; keep direct Safe faucet, owner execute-order, and browser multisig out of scope. |
| Safe Treasury first-level workspace | Approved | User | 2026-07-24T12:45:00+07:00 | Move Safe out of Wallet into the primary navigation while retaining every existing Wallet, Trade, Activity, and Safe capability with matching visual language. |
| Safe Treasury compact workspace | Approved | User | 2026-07-24T13:29:00+07:00 | Remove the redundant Overview and execution-context grid; retain Safe identity, threshold, module/signer state, four balances, reveal, and funding in a compact header above the four operational sections. |
| Phase 6 final quality pass | Approved | User | 2026-07-24T14:10:00+07:00 | Align every Safe Treasury workflow with the established product UI/UX without removing capabilities, fix any remaining Phase 6 or rubric weakness, and leave Phase 7 to the user. |
| Final submission | Pending |  |  |  |

## 5. Blockers và câu hỏi mở

| ID | Blocker/câu hỏi | Phase ảnh hưởng | Mức ảnh hưởng | Owner | Trạng thái | Tham chiếu |
|---|---|---|---|---|---|---|
| BLK-001 | Deadline và múi giờ submission chưa xác minh độc lập | 1+ | Medium | User/Organizer | Closed | `docs/important-notes.md` |
| BLK-002 | Trọng số rubric không có số học chính thức trong brief đã cung cấp | 1+ | Medium | User/Organizer | Closed | `docs/judging-criteria.md` |

## 6. Bước tiếp theo

1. User reviews the completed compact Safe Treasury workspace.
2. Deploy the updated frontend when the user lifts the existing deployment deferral, then confirm the final MetaMask flow on the production URL.
3. Mark Phase 6 completed, then record the demo and write the X submission post.

## 7. Quy tắc cập nhật PLAN.md

- Cập nhật `Trạng thái hiện tại` khi bắt đầu hoặc kết thúc một phase.
- Chỉ một phase được `In progress` tại một thời điểm.
- Không bắt đầu phase có Approval Gate chưa được thông qua.
- Khi bị chặn, ghi blocker, owner và ảnh hưởng.

## 8. Completion Checklist

- [x] Context đã được người dùng kiểm tra.
- [x] Research có evidence và nguồn.
- [x] Ý tưởng cuối cùng đã được người dùng chọn.
- [x] Product Plan đã được phê duyệt.
- [x] Build Plan đã được phê duyệt.
- [x] Core Product Ready Gate đã đạt lại sau remediation và approved feature extension.
- [x] Landing page phản ánh đúng sản phẩm thật và CTA hoạt động.
- [x] Smart Contracts Nox/ERC-7984 thật được redeploy và kiểm thử trên Ethereum Sepolia Testnet.
- [x] Public confidential orderbook và stateless keeper đã được triển khai, kiểm thử với order Sepolia thật.
- [x] Orderbook/keeper đã chuyển sang incremental lifecycle-event index với checkpoint có thể rebuild; linear historical ID scans đã được loại bỏ.
- [x] Push/PR CI và manual secret-protected Sepolia E2E workflows đã được thêm và kiểm tra cú pháp.
- [x] Threat model, positive default minOut, arbitrary-wallet E2E, MCP write flow và sanitized evidence artifacts đã được triển khai; live Sepolia verification đã pass.
- [x] Docker-backed Nox runtime integration suite và nightly/manual workflow đã được thêm; local execution được skip vì workspace không có Docker.
- [x] Groq Strategy Agent, nine-tool MCP v4 adapter, and fail-open keeper observer have unit, responsive, and live provider evidence without granting AI transaction authority.
- [x] Server-side Groq secret is configured on Vercel; public planner/observer endpoints and the `/app/trade?mode=agent` route pass production smoke tests.
- [x] Frontend production đã deploy và public read-only smoke test đã pass tại `https://noxswap-iexec.vercel.app`.
- [x] Safe v1.4.1 treasury, allowlisted Nox module, private swap, selective viewer, module revoke/re-enable and confidential order create/cancel have live Sepolia evidence.
- [x] Safe swap tolerance/deadline, on-chain Activity, draft-only Strategy Agent, and recoverable Safe unwrap have unit, responsive, contract, and live Sepolia evidence.
- [x] Safe Treasury is a first-level desktop/mobile workspace with a compact custody header and four URL-addressable sections; Wallet, Trade, Activity, Landing, and Docs retain their prior content and pass responsive regression.
- [x] Đã tạo file README.md chính thức và feedback.md ở root repository.
- [ ] Submission checklist canonical đã hoàn thành.
- [ ] Bài nộp đã được final review.
