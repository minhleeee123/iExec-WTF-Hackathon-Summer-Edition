# Research Plan

> Trạng thái: Sẵn sàng để research agent thực hiện
> Mọi phát hiện phải có nguồn hoặc được đánh dấu là inference.

## 1. Input cần đọc

- `docs/competition-summary.md`
- `docs/requirements.md`
- `docs/judging-criteria.md`
- `docs/important-notes.md`

## 2. Mục tiêu nghiên cứu

- Hiểu rõ người dùng và vấn đề của challenge.
- Xác minh web/mobile app có thể tạo giá trị cốt lõi.
- Tìm giải pháp tương tự và khoảng trống có thể khai thác.
- Kiểm tra tính khả thi của dữ liệu, API và sponsor technology.
- Tạo evidence đầu vào cho brainstorm và rubric mapping.

## 3. Câu hỏi và từ khóa

- Vấn đề chính: Thêm privacy vào hạ tầng DeFi/open-source public mà không phá composability.
- Người dùng mục tiêu: Builders, DeFi users, teams cần confidential workflows.
- Ngành/lĩnh vực: Confidential DeFi / privacy-preserving smart contracts.
- Công nghệ bắt buộc: iExec Nox, ETH Sepolia deployment.
- Sponsor technology: iExec Nox protocol, docs, wizard, Hardhat plugin/starter.
- Từ khóa sản phẩm tương tự: confidential DeFi, privacy-preserving swap, private treasury, encrypted smart contract, Nox integration.
- Giả thuyết cần kiểm tra: Một front-end end-to-end có thể chứng minh value của Nox rõ hơn một protocol-only demo.

## 4. Phạm vi nghiên cứu

Ưu tiên theo thứ tự:

1. Tài liệu chính thức và sponsor technical docs.
2. Nhu cầu, workflow và pain point của người dùng.
3. Sản phẩm trực tiếp hoặc gián tiếp có liên quan tới challenge và rubric.
4. Dự án hackathon, open-source hoặc case study đáng tin cậy.
5. Rủi ro về dữ liệu, API, quyền truy cập và khả năng demo.

Số lượng sản phẩm so sánh phụ thuộc challenge. Thường chọn 2–5 sản phẩm thật sự liên quan; không thêm đối thủ chỉ để đủ số lượng hoặc vì sản phẩm đó nổi tiếng.

Ưu tiên sản phẩm đáp ứng ít nhất một điều kiện:

- Giải quyết cùng vấn đề hoặc phục vụ cùng nhóm người dùng.
- Có core flow web/mobile tương tự.
- Thể hiện tốt một tiêu chí trong rubric của cuộc thi.
- Là dự án thắng giải hoặc case study có bằng chứng liên quan.

## 5. Evidence Log

| ID | Phát hiện | Fact/Inference | Nguồn hoặc URL | Thời điểm truy cập | Độ tin cậy | Liên quan tới rubric |
|---|---|---|---|---|---|---|
| RES-001 |  |  |  |  |  |  |

## 6. Phân tích sản phẩm hoặc dự án tương tự

| Sản phẩm/dự án | Mức phù hợp với challenge | Người dùng và core flow | Điểm mạnh | Điểm yếu/khoảng trống | Rubric ID liên quan | Evidence ID |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

## 7. Competitor/Rubric Benchmark

Với từng tiêu chí chính thức, tìm sản phẩm, dự án hoặc case study phù hợp để hiểu loại bằng chứng có thể thuyết phục giám khảo.

| Rubric ID | Sản phẩm/dự án tham khảo | Họ thể hiện tốt điều gì | Bằng chứng quan sát được | Khoảng trống có thể khai thác | Evidence ID |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

Không sao chép tính năng hoặc tuyên bố rằng một sản phẩm đã đạt điểm cao nếu không có nguồn. Chỉ rút ra pattern, tiêu chuẩn chất lượng và cơ hội khác biệt có bằng chứng.

Nếu không tìm được sản phẩm phù hợp cho một rubric ID, ghi `Chưa tìm thấy` cùng phạm vi và nguồn đã kiểm tra.

## 8. Feasibility

| Chủ đề | Điều cần xác minh | Kết quả | Evidence ID | Rủi ro |
|---|---|---|---|---|
| Dữ liệu | Có dữ liệu demo đủ để không phải mock core flow không | Chưa xác minh |  | High |
| API/SDK | Nox packages, wizard, Hardhat plugin/starter có đủ cho build không | Chưa xác minh |  | Medium |
| Sponsor technology | Nox có chỗ đứng thực trong core flow nào | Chưa xác minh |  | High |
| Web/mobile demo | Luồng UI nào chứng minh giá trị nhanh nhất | Chưa xác minh |  | High |
| Thời gian triển khai | Có thể hoàn thành trước deadline chưa xác minh | Chưa xác minh |  | High |

## 9. Khoảng trống và cơ hội

- Nhu cầu chưa được đáp ứng: Confidential workflow cho protocol công khai.
- Workflow chưa hiệu quả: Privacy thường buộc phải hi sinh composability hoặc phải sửa protocol gốc.
- Trải nghiệm chưa tốt: Các demo privacy hay dừng ở proof-of-concept thay vì app chạy thật.
- Công nghệ chưa được tận dụng: Nox có thể ở lớp xử lý encrypted data trong core flow.
- Điểm khác biệt có thể xây và demo: Route một hành động DeFi qua Nox mà người dùng vẫn nhìn thấy một UI product hoàn chỉnh.

## 10. Liên kết với rubric

Mỗi phát hiện quan trọng phải trả lời:

- Hỗ trợ tiêu chí nào?
- Có thể biến thành bằng chứng hoặc demo không?
- Có khả thi trước deadline không?
- Có phụ thuộc vào dữ liệu hoặc dịch vụ khó kiểm soát không?

## 11. Handoff cho brainstorm

- Các evidence ID quan trọng: RES-001
- Competitor/rubric benchmark đáng chú ý: Chưa xác minh
- Cơ hội nên brainstorm: private swap, private treasury movement, private wallet flow, private lending/streaming.
- Hướng nên tránh: wallet shell hoặc Nox integration chỉ ở backend không có visible value.
- Rủi ro chưa giải quyết: deadline, exact rubric weights, possible hidden form submission.
- Câu hỏi cần người dùng hoặc ban tổ chức xác nhận: deadline chính thức và rubric numeric nếu có.
