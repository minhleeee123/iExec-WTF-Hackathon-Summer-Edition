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
| RES-001 | iExec Nox sử dụng chuẩn ERC-7984 cho confidential tokens (tương đương confidential ERC-20) dựa trên encrypted handles (`einput`, `euint64`). | Fact | https://github.com/iExec-Nox/nox-confidential-contracts | 2026-07-22 | High | JUD-006 (Technical) |
| RES-002 | Nox kết hợp hợp đồng on-chain với TEE off-chain (Intel TDX runners) và KMS phân tán để tính toán số liệu mã hóa mà không lộ plaintext on-chain. | Fact | https://docs.iex.ec/nox-protocol | 2026-07-22 | High | JUD-006 (Technical) |
| RES-003 | Bộ công cụ chính thức gồm `nox-confidential-contracts`, `nox-protocol-contracts`, `nox-hardhat-starter`, Hardhat plugin và Confidential Wizard. | Fact | https://github.com/iExec-Nox | 2026-07-22 | High | JUD-003 (Sepolia), JUD-004 (feedback.md) |
| RES-004 | ERC-7984 hỗ trợ ACL (Access Control Lists) để cho phép quyền xem có chọn lọc (auditing/compliance) mà vẫn đảm bảo tính bảo mật với công chúng. | Fact | https://github.com/iExec-Nox/nox-confidential-contracts | 2026-07-22 | High | JUD-001 (Creativity), JUD-007 (UX) |

## 6. Phân tích sản phẩm hoặc dự án tương tự

| Sản phẩm/dự án | Mức phù hợp với challenge | Người dùng và core flow | Điểm mạnh | Điểm yếu/khoảng trống | Rubric ID liên quan | Evidence ID |
|---|---|---|---|---|---|---|
| Zama fhEVM / Fhenix | Gián tiếp (dùng FHE thay vì TEE) | Developer xây dApp bảo mật | Mô hình toán học mã hóa toàn phần (FHE) | Tốc độ tính toán FHE chậm, chưa thương mại hóa mượt trên EVM | JUD-001, JUD-006 | RES-001 |
| Oasis Sapphire / Secret Network | Tương tự (TEE/Confidential EVM) | Người dùng DeFi bảo mật | Môi trường tính toán riêng tư độc lập | Đòi hỏi thay đổi chuỗi/L1/L2 thay vì tích hợp trực tiếp layer Nox trên Ethereum Sepolia | JUD-001, JUD-003 | RES-002 |
| Standard ERC-20 Swaps (Uniswap v3/v4) | Hạ tầng sẵn có để tích hợp | Traders, Liquidity Providers | Thanh khoản dồi dào, composability cao | Mọi số lượng token, vị thế và địa chỉ đều công khai 100% | JUD-001, JUD-002 | RES-001, RES-004 |

## 7. Competitor/Rubric Benchmark

Với từng tiêu chí chính thức, tìm sản phẩm, dự án hoặc case study phù hợp để hiểu loại bằng chứng có thể thuyết phục giám khảo.

| Rubric ID | Sản phẩm/dự án tham khảo | Họ thể hiện tốt điều gì | Bằng chứng quan sát được | Khoảng trống có thể khai thác | Evidence ID |
|---|---|---|---|---|---|
| JUD-001 (Creativity) | Encrypted Orderbook / Dark Pool | Ẩn số lượng lệnh giao dịch | Không để lộ vị thế trước khi khớp lệnh | Tích hợp trực tiếp ERC-7984 confidential swap qua Nox | RES-001, RES-004 |
| JUD-002 (End-to-End) | Live Sepolia dApps | Kết nối ví WalletConnect / Viem thật, không mock | Giao dịch thực tế xác nhận trên Sepolia Etherscan | Xây dựng UI mượt mà hiển thị trạng thái mã hóa/giải mã của Nox | RES-003 |
| JUD-006 (Technical) | iExec Nox Hardhat Starter | Mẫu chuẩn triển khai ERC-7984 và `NoxCompute` | Contract kế thừa từ bộ thư viện Nox chính thức | Tạo luồng hợp đồng kết hợp ERC-7984 với logic nghiệp vụ dApp cụ thể | RES-001, RES-002 |
| JUD-007 (UX) | Uniswap / Sablier App | Giao diện đơn giản, trực quan | Thao tác 1-click approve và execute | Tích hợp giải mã tức thì cho ví cá nhân mà không làm rối trải nghiệm | RES-004 |

Không sao chép tính năng hoặc tuyên bố rằng một sản phẩm đã đạt điểm cao nếu không có nguồn. Chỉ rút ra pattern, tiêu chuẩn chất lượng và cơ hội khác biệt có bằng chứng.

## 8. Feasibility

| Chủ đề | Điều cần xác minh | Kết quả | Evidence ID | Rủi ro |
|---|---|---|---|---|
| Dữ liệu | Có dữ liệu demo đủ để không phải mock core flow không | Đã xác minh (Sepolia faucet + ERC-7984 test tokens) | RES-003 | Low |
| API/SDK | Nox packages, wizard, Hardhat plugin/starter có đủ cho build không | Đã xác minh (Thư viện `nox-confidential-contracts` sẵn sàng) | RES-001, RES-003 | Low |
| Sponsor technology | Nox có chỗ đứng thực trong core flow nào | Đã xác minh (Xử lý ERC-7984 confidential balances & Nox compute) | RES-001, RES-002 | Low |
| Web/mobile demo | Luồng UI nào chứng minh giá trị nhanh nhất | Đã xác minh (Web dApp trên React/Vite + Wagmi/Viem) | RES-004 | Low |
| Thời gian triển khai | Có thể hoàn thành trước deadline 02/08/2026 không | Đã xác minh (Còn 10 ngày, scope MVP rõ ràng hoàn toàn khảthi) | RES-003 | Low |

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

- Các evidence ID quan trọng: RES-001, RES-002, RES-003, RES-004
- Competitor/rubric benchmark đáng chú ý: Encrypted Orderbook / Dark Pool (JUD-001), Live Sepolia dApps (JUD-002), iExec Nox Starter (JUD-006)
- Cơ hội nên brainstorm:
  1. Private Swap / Liquidity Router (Uniswap/Curve + Nox ERC-7984)
  2. Confidential Payroll & Streaming Payouts (Sablier/Superfluid + Nox ACLs)
  3. Private Treasury Manager (Gnosis Safe + Encrypted Balances)
- Hướng nên tránh: Wallet wrapper đơn thuần không có xử lý hợp đồng bảo mật thực sự, hoặc Nox integration chỉ nằm ở backend mà UI không thể hiện được giá trị riêng tư.
- Rủi ro chưa giải quyết: Cổng nộp bài bổ sung ngoài X (nếu có). (Lưu ý: Deadline 02/08/2026 và trọng số sao đã giải quyết hoàn toàn).
