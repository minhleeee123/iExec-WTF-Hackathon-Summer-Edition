# Judging Criteria

> Trạng thái: Hoàn tất cho workspace handoff
> Đây là nguồn canonical cho rubric và trọng số. Giữ nguyên wording chính thức; mọi diễn giải của agent phải nằm ở phần riêng.

## 1. Rubric chính thức

| ID | Tiêu chí | Trọng số | Wording/mô tả chính thức | Cách tính điểm chính thức | Source ID |
|---|---|---:|---|---|---|
| JUD-001 | Project creativity | ⭐⭐⭐ (3/14) | Creativity is an evaluation focus | Dựa trên số lượng sao (3 sao) | SRC-001 |
| JUD-002 | Accessible and end-to-end without mock data | ⭐⭐⭐ (3/14) | Must work end to end without mock data | Dựa trên số lượng sao (3 sao) | SRC-001 |
| JUD-003 | Deployed on ETH Sepolia | ⭐⭐ (2/14) | Must be deployed on ETH Sepolia | Dựa trên số lượng sao (2 sao) | SRC-001 |
| JUD-004 | `feedback.md` about iExec tools | ⭐⭐ (2/14) | Feedback doc must be in the GitHub repo | Dựa trên số lượng sao (2 sao) | SRC-001 |
| JUD-005 | 4 min max video | ⭐⭐ (2/14) | Demo video must be no longer than 4 minutes | Dựa trên số lượng sao (2 sao) | SRC-001 |
| JUD-006 | Technical implementation | ⭐ (1/14) | How well the confidential DeFi project leverages iExec Nox Protocol | Dựa trên số lượng sao (1 sao) | SRC-001 |
| JUD-007 | UX | ⭐ (1/14) | User-friendly and intuitive application | Dựa trên số lượng sao (1 sao) | SRC-001 |

## 2. Kiểm tra trọng số

- Tổng trọng số công bố: 14 sao (được quy đổi tương ứng với số sao)
- Tổng trọng số đã trích xuất: 14 sao
- Có khớp 100% hoặc thang điểm chính thức không: Có, đã xác nhận thang điểm chỉ tính theo số sao được phân bổ cho từng tiêu chí.
- Ngoại lệ hoặc tiêu chí pass/fail: End-to-end accessibility (⭐⭐⭐), Sepolia deployment (⭐⭐), `feedback.md` (⭐⭐) và video max 4 phút (⭐⭐) là các yêu cầu bắt buộc xuất hiện như điều kiện mạnh trong brief.

## 3. Diễn giải phục vụ sản phẩm — Không phải wording chính thức

| Tiêu chí | Giám khảo có thể cần thấy | Sản phẩm cần chứng minh | Bằng chứng cần chuẩn bị | Cách demo |
|---|---|---|---|---|
| Creativity | Một use case có góc mới, không chỉ là wrapper | Điểm mới về privacy trong workflow | Short explanation và comparison | Show the unique flow in 1 minute |
| End-to-end accessible | Không mock, chạy từ đầu đến cuối | Một demo path ổn định | Live deployment, smoke test | Walk through the full user journey |
| Technical implementation | Nox thật sự ở core flow | Nox xử lý privacy/composability | Code path, network/deployment evidence | Show where Nox changes the flow |
| UX | Dễ hiểu và có thể dùng thật | Luồng rõ ràng, ít bước | Screens, interactions, error handling | Narrate the user experience quickly |

## 4. Câu hỏi kiểm tra ý tưởng

- Ý tưởng có trực tiếp giải quyết challenge không?
- Web/mobile app có phải phần cốt lõi thay vì wrapper hình thức không?
- Công nghệ bắt buộc có vai trò thực trong core flow không?
- Điểm khác biệt có thể giải thích trong một câu không?
- Có thể demo giá trị trong thời lượng cho phép không?
- Có bằng chứng rõ cho từng tiêu chí không?
- Phạm vi có thể hoàn thành trước deadline không?

## 5. Rủi ro mất điểm

| Rủi ro | Tiêu chí ảnh hưởng | Source ID hoặc căn cứ | Cách giảm thiểu |
|---|---|---|---|
| Mock data hoặc demo không end-to-end | End-to-end accessibility | SRC-001 | Dùng dữ liệu thật hoặc luồng thực, thêm smoke test |
| Nox chỉ được gắn hình thức | Technical implementation | SRC-001 | Đặt Nox vào core flow của product |
| Video quá dài hoặc không rõ | Video requirement | SRC-001 | Giữ video dưới 4 phút và bám core flow |

## 6. Thông tin đã xác minh

- Trọng số chính thức chỉ dựa trên số sao biểu thị trong brief (tổng cộng 14 sao). Không có thang điểm số học phần trăm chính thức khác.
