# Brainstorm and Idea Selection Plan

> Trạng thái: Chờ Research Plan có kết quả
> Không tự chọn ý tưởng cuối cùng thay người dùng.

## 1. Input bắt buộc

- Requirements và điều kiện bị loại.
- Rubric chính thức.
- Participation Fit Gate.
- Evidence Log từ research.
- Deadline và nguồn lực đã biết.

## 2. Tạo ý tưởng

Mặc định tạo 8–12 ý tưởng có khác biệt thực chất. Có thể tạo ít hơn nếu phạm vi challenge rất hẹp và phải ghi lý do.

Mỗi ý tưởng gồm:

- Tên và mô tả một câu.
- Vấn đề và người dùng mục tiêu.
- Web/mobile core flow.
- Giá trị khác biệt.
- Công nghệ bắt buộc hoặc sponsor technology được dùng ở đâu.
- Evidence ID hỗ trợ.
- Phạm vi MVP.
- Demo moment.
- Rủi ro và dependency chính.

## 3. Hard Gate

Chỉ chấm điểm ý tưởng vượt qua tất cả điều kiện bắt buộc.

| Ý tưởng | Eligibility | Đúng challenge | Web/mobile là core | Công nghệ bắt buộc | Khả thi trước deadline | Có thể demo | Kết quả |
|---|---|---|---|---|---|---|---|
|  | Pass/Fail | Pass/Fail | Pass/Fail | Pass/Fail/N/A | Pass/Fail | Pass/Fail | Pass/Fail |

Loại ý tưởng nếu:

- Vi phạm yêu cầu hoặc điều kiện tham gia.
- Web/app chỉ là wrapper hình thức.
- Sponsor technology chỉ được thêm cho có.
- Không thể hoàn thành hoặc demo trước deadline.
- Phụ thuộc vào dữ liệu/API không thể tiếp cận và không có fallback.
- Có quá nhiều tính năng cốt lõi.

## 4. Chấm theo rubric chính thức

Với mỗi ý tưởng đã Pass, chấm từng tiêu chí theo thang 1–5 và giải thích bằng evidence.

Nếu rubric có trọng số, dùng:

```text
Điểm quy đổi = (Điểm 1–5 / 5) × Trọng số chính thức
Tổng điểm dự kiến = Tổng các điểm quy đổi
```

| Ý tưởng | Rubric ID | Trọng số chính thức | Điểm 1–5 | Điểm quy đổi | Evidence/lý do |
|---|---|---:|---:|---:|---|
|  |  |  |  |  |  |

Nếu ban tổ chức không công bố trọng số, ghi `Chưa xác minh`. Chỉ dùng trọng số nội bộ khi người dùng đồng ý và phải gắn nhãn `Internal scoring`, không trình bày như rubric chính thức.

## 5. Đánh giá bổ sung

| Ý tưởng | Khác biệt | Khả thi | Demo clarity | Rủi ro | Ghi chú |
|---|---:|---:|---:|---:|---|
|  |  |  |  |  |  |

Các điểm bổ sung không được làm một ý tưởng vi phạm hard gate trở thành hợp lệ.

## 6. Shortlist

Chọn tối đa 3–5 ý tưởng để trình người dùng. Với mỗi ý tưởng, ghi:

- Lý do nên chọn và không nên chọn.
- Tổng điểm rubric dự kiến.
- Phạm vi MVP và non-goals sơ bộ.
- Core demo flow.
- Evidence mạnh nhất.
- Rủi ro và câu hỏi chưa xác minh.

## 7. Approval Gate

Dừng và chờ người dùng chọn ý tưởng cuối cùng.

Không điền Product Plan, chọn tech stack hoặc bắt đầu code trước khi có lựa chọn rõ ràng.
