# Important Notes

> Trạng thái: Hoàn tất cho workspace handoff
> File này quản lý nguồn, deadline, xung đột, rủi ro bị loại và thông tin chưa xác minh.

## 1. Source Register

| Source ID | Tên nguồn | Loại nguồn | File/URL | Đơn vị phát hành | Thời điểm truy cập | Cấp ưu tiên |
|---|---|---|---|---|---|---:|
| SRC-001 | User-provided challenge brief for iExec WTF Hackathon Summer Edition | User-provided | `docs/original/user-provided-challenge-brief.md` | User-provided | 2026-07-21T21:34:36+07:00 | 7 |

## 2. Deadline

- Múi giờ địa phương dùng để quy đổi: GMT+7 (Giờ Đông Dương)

| Mốc | Thời gian gốc | Múi giờ gốc | Thời gian địa phương (GMT+7) | Source ID | Trạng thái |
|---|---|---|---|---|---|
| Đăng ký (Pre-registration) | 2026/07/02 05:00 | Chưa rõ (có thể UTC) | 2026/07/02 05:00 | User | Xác nhận |
| Mở cổng nộp bài (Submission) | 2026/07/06 05:00 | Chưa rõ (có thể UTC) | 2026/07/06 05:00 | User | Xác nhận |
| Hạn chót nộp bài (Deadline) | 2026/08/02 04:59 | Chưa rõ (có thể UTC) | 2026/08/02 04:59 | User | Xác nhận |

## 3. Xung đột giữa nguồn

| Chủ đề | Thông tin A | Source ID A | Thông tin B | Source ID B | Cách xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| Chưa kiểm tra |  |  |  |  |  | Mở |

## 4. Rủi ro bị loại hoặc mất quyền chấm

| Rủi ro | Bằng chứng/Source ID | Mức ảnh hưởng | Hành động phòng tránh |
|---|---|---|---|
| Reuse project from previous Vibe Coding Hackathon leads to disqualification | SRC-001 | High | Xác nhận project mới, không tái sử dụng project cũ. |
| Missing ETH Sepolia deployment or end-to-end accessibility | SRC-001 | High | Thiết kế demo để chạy thật trên Sepolia và tránh mock data cho core flow. |
| Missing public GitHub, README, docs, `feedback.md` or X submission post | SRC-001 | High | Đưa các deliverable này vào scope submission ngay từ đầu. |

## 5. Thông tin chưa xác minh

| Chủ đề | Source đã kiểm tra | Điều chưa rõ | Ảnh hưởng | Người cần xác nhận |
|---|---|---|---|---|
| Cổng nộp chính thức ngoài X post | SRC-001 | Có form submission hoặc bước bổ sung nào không | Ảnh hưởng submission checklist | User/Organizer |

## 6. Câu hỏi cần làm rõ

| Câu hỏi | Lý do cần biết | Deadline cần câu trả lời | Trạng thái |
|---|---|---|---|
| Cổng nộp chính thức ngoài X post có tồn tại không? | Xác minh toàn bộ các kênh submission | Trước khi nộp bài | Open |

## 7. Inference và giả định

| Nội dung | Loại | Căn cứ | Có cần người dùng phê duyệt? |
|---|---|---|---|
| Web/mobile app là phù hợp | Inference | Brief yêu cầu functional front-end, UX và end-to-end accessibility | Không, đã được fit gate chấp nhận |
| Official website tạm dùng linktr.ee iExec tech | Inference | Link được nhắc trong brief, chưa kiểm chứng riêng | Có |
