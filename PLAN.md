# Master Plan

> Trạng thái ban đầu: Workspace handoff đang được chuẩn bị
> File này điều phối tiến độ. Không sao chép deadline, requirements hoặc rubric vào đây.

## 1. Trạng thái hiện tại

- Giai đoạn hiện tại: Phase 7 — Submission
- Trạng thái: In progress
- Bước tiếp theo: Quay Video Demo (≤ 4 phút) và viết bài đăng trên X (Twitter) kèm tag `@iEx_ec`.
- Blocker hiện tại: Không.
- Đang chờ phê duyệt từ: Không.
- Cập nhật lần cuối: 2026-07-22T13:51:30+07:00

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
| 6. Development | Build Plan đã duyệt | Hoàn thiện core product, vượt Core Product Ready Gate, triển khai Sepolia | Demo-ready application và landing page | Milestone verification | Completed |
| 7. Submission | Demo-ready application và landing page | Hoàn thiện mọi deliverable bắt buộc | Bài nộp hoàn chỉnh | Người dùng final review | In progress |

## 4. Approval Log

| Gate | Quyết định | Người xác nhận | Thời điểm | Bằng chứng hoặc ghi chú |
|---|---|---|---|---|
| Participation Fit | Approved | User | 2026-07-21T21:34:36+07:00 | Challenge yêu cầu functional front-end, end-to-end accessibility, ETH Sepolia deploy, UX và iExec Nox integration. |
| Context verification | Approved | User | 2026-07-22T10:43:00+07:00 | Đã xác nhận chi tiết deadline chính thức từ người dùng (Hạn chót 02/08/2026) và trọng số sao của rubric. |
| Idea selection | Approved | User | 2026-07-22T10:46:53+07:00 | Đã chọn Option 1: NoxSwap — Confidential Liquidity & Swap Router. |
| Product Plan | Approved | User | 2026-07-22T10:56:00+07:00 | Người dùng đã xem xét và đồng ý thực hiện Product Plan cho NoxSwap. |
| Build Plan | Approved | User | 2026-07-22T10:56:30+07:00 | Phê duyệt Build Plan cho ứng dụng NoxSwap. |
| Core Development & Sepolia Deploy | Approved | System / User | 2026-07-22T13:51:30+07:00 | Smart Contracts đã deploy thành công lên Sepolia: Router 0x3858...a7a. |
| Final submission | Pending |  |  |  |

## 5. Blockers và câu hỏi mở

| ID | Blocker/câu hỏi | Phase ảnh hưởng | Mức ảnh hưởng | Owner | Trạng thái | Tham chiếu |
|---|---|---|---|---|---|---|
| BLK-001 | Deadline và múi giờ submission chưa xác minh độc lập | 1+ | Medium | User/Organizer | Closed | `docs/important-notes.md` |
| BLK-002 | Trọng số rubric không có số học chính thức trong brief đã cung cấp | 1+ | Medium | User/Organizer | Closed | `docs/judging-criteria.md` |

## 6. Bước tiếp theo

1. Hướng dẫn kịch bản quay Video Demo (≤ 4 phút) phản ánh sản phẩm thật NoxSwap trên Sepolia.
2. Viết nội dung bài đăng trên X (Twitter) giới thiệu sản phẩm kèm hashtag và tag `@iEx_ec`.

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
- [x] Core Product Ready Gate đã đạt trước khi làm landing page.
- [x] Landing page phản ánh đúng sản phẩm thật và CTA hoạt động.
- [x] Smart Contracts được deploy thật lên Ethereum Sepolia Testnet.
- [x] Đã tạo file README.md chính thức và feedback.md ở root repository.
- [ ] Submission checklist canonical đã hoàn thành.
- [ ] Bài nộp đã được final review.
