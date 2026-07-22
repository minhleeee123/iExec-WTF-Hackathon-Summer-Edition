# iExec WTF Hackathon Summer Edition — Project Instructions

## 1. Mục tiêu

Workspace này chứa context cho iExec WTF Hackathon Summer Edition. Cuộc thi phù hợp với web/mobile app vì brief yêu cầu functional front-end, end-to-end accessibility, ETH Sepolia deployment và UX.

Sản phẩm ưu tiên:

- Web application.
- Mobile application.
- Progressive Web App.
- Web/mobile client kết hợp API, backend, AI service hoặc sponsor technology.

## 2. Nội dung phải đọc

Sau file này, đọc `PLAN.md` để xác định phase hiện tại, approval và bước tiếp theo.

Trước khi nghiên cứu hoặc lập kế hoạch, đọc tiếp:

1. `docs/competition-summary.md`
2. `docs/competition-summary-vi.md`
3. `docs/requirements.md`
4. `docs/judging-criteria.md`
5. `docs/important-notes.md`

Sau đó đọc file phù hợp trong `plan/` theo phase hiện tại.

## 3. Nguồn sự thật

`docs/original/` là kho lưu nguồn đầu vào. Không mặc định mọi tài liệu trong đó đều là nguồn chính thức.

Thứ tự ưu tiên:

1. Thể lệ chính thức.
2. Trang challenge hoặc track chính thức.
3. FAQ chính thức.
4. Tài liệu kỹ thuật của nhà tài trợ.
5. Email chính thức từ ban tổ chức.
6. Nguồn bên thứ ba.
7. Nội dung người dùng cung cấp nhưng chưa có nguồn xác nhận.
8. Suy luận của agent.

Nếu context, bản dịch hoặc kế hoạch mâu thuẫn với nguồn ưu tiên cao hơn:

1. Dừng sử dụng thông tin mâu thuẫn.
2. Kiểm tra source ID và tài liệu gốc trong `docs/original/`.
3. Cập nhật file canonical.
4. Ghi lại xung đột trong `docs/important-notes.md`.

## 4. Trách nhiệm canonical

- `PLAN.md`: phase, trạng thái, approval, blocker và bước tiếp theo.
- `docs/competition-summary.md`: tổng quan ngắn và Participation Fit Gate.
- `docs/competition-summary-vi.md`: bản dịch/tóm tắt tiếng Việt.
- `docs/requirements.md`: eligibility, yêu cầu sản phẩm, công nghệ, IP, giới hạn và submission.
- `docs/judging-criteria.md`: rubric, trọng số và evidence mapping.
- `docs/important-notes.md`: nguồn, deadline, xung đột, rủi ro bị loại và câu hỏi chưa xác minh.

Khi cùng một dữ kiện xuất hiện ở nhiều nơi, file canonical được ưu tiên.

## 5. Thứ tự làm việc

### Giai đoạn 1 — Hiểu cuộc thi

- Xác nhận Participation Fit Gate.
- Kiểm tra requirements, rubric, deadline và thông tin chưa xác minh.
- Không bắt đầu nghiên cứu hoặc code nếu yêu cầu bắt buộc chưa rõ.

### Giai đoạn 2 — Nghiên cứu và brainstorm

Làm theo:

- `plan/research-plan.md`
- `plan/brainstorm-plan.md`

### Giai đoạn 3 — Product plan

Chỉ hoàn thiện `plan/product-plan.md` sau khi người dùng chọn ý tưởng.

### Giai đoạn 4 — Build plan

Chỉ hoàn thiện `plan/build-plan.md` sau khi Product Plan được phê duyệt.

### Giai đoạn 5 — Phát triển và submission

- Web/mobile client và landing page: `source-code/frontend/`
- Backend/API nếu cần: `source-code/backend/`
- Slide: `submission/slide/`
- Video: `submission/video/`

## 6. Quy tắc Web/App

- Người xem phải hiểu giá trị sản phẩm nhanh.
- Core flow phải ngắn, ổn định và thể hiện trực tiếp đề bài.
- Sponsor technology phải đóng vai trò thực, không chỉ được gắn thêm để đủ điều kiện.
- Có dữ liệu mẫu và fallback phù hợp cho dịch vụ ngoài.
- Không thêm backend, database, authentication hoặc deployment nếu không phục vụ core flow hoặc requirement.

## 7. Core-product-first và Landing Page

Landing page là deliverable bắt buộc của bản cuối nhưng chỉ được làm sau `Core Product Ready Gate`.

## 8. Quy tắc chung

- Không tự bịa yêu cầu hoặc thay đổi công nghệ bắt buộc.
- Không bỏ qua deadline, điều kiện bị loại hoặc submission requirement.
- Phân biệt fact, inference và thông tin chưa xác minh.
- Không thêm tính năng lớn ngoài Product Plan mà chưa được phê duyệt.

## 9. Điều kiện trước khi bắt đầu code

Chỉ bắt đầu code khi:

- Cuộc thi đã được xác nhận phù hợp hoặc người dùng đã chấp nhận ngoại lệ.
- Yêu cầu bắt buộc và rubric đã rõ.
- Ý tưởng cuối cùng đã được người dùng chọn.
- MVP và non-goals đã được xác định.
- Product Plan và Build Plan đã được phê duyệt.
