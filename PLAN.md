# Master Plan

> Trạng thái ban đầu: Workspace handoff đang được chuẩn bị
> File này điều phối tiến độ. Không sao chép deadline, requirements hoặc rubric vào đây.

## 1. Trạng thái hiện tại

- Giai đoạn hiện tại: Phase 6 — Development validation and public deployment
- Trạng thái: In progress
- Bước tiếp theo: Configure the server-side Groq secret on production, smoke-test Strategy Agent and MetaMask write flow, then record the demo.
- Blocker hiện tại: Local Nox off-chain test stack cần Docker nhưng môi trường hiện tại không có Docker; sử dụng compile/unit tests và live Sepolia verification làm acceptance evidence.
- Đang chờ phê duyệt từ: Không.
- Cập nhật lần cuối: 2026-07-23T02:10:26+07:00

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
| Final submission | Pending |  |  |  |

## 5. Blockers và câu hỏi mở

| ID | Blocker/câu hỏi | Phase ảnh hưởng | Mức ảnh hưởng | Owner | Trạng thái | Tham chiếu |
|---|---|---|---|---|---|---|
| BLK-001 | Deadline và múi giờ submission chưa xác minh độc lập | 1+ | Medium | User/Organizer | Closed | `docs/important-notes.md` |
| BLK-002 | Trọng số rubric không có số học chính thức trong brief đã cung cấp | 1+ | Medium | User/Organizer | Closed | `docs/judging-criteria.md` |

## 6. Bước tiếp theo

1. Chạy manual MetaMask happy path trên URL production; lưu tx evidence.
2. Chạy lại Core Product Ready Gate rồi mới quay video và viết bài X.

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
- [x] Frontend production đã deploy và public read-only smoke test đã pass tại `https://frontend-dusky-five-56.vercel.app`.
- [x] Đã tạo file README.md chính thức và feedback.md ở root repository.
- [ ] Submission checklist canonical đã hoàn thành.
- [ ] Bài nộp đã được final review.
