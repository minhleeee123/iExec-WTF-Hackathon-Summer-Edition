# Brainstorm and Idea Selection Plan

> Trạng thái: Complete (Ý tưởng đã được người dùng lựa chọn)

## 1. Input bắt buộc

- Requirements và điều kiện bị loại (`docs/requirements.md`).
- Rubric chính thức (`docs/judging-criteria.md`).
- Participation Fit Gate (`docs/competition-summary.md`).
- Evidence Log từ research (RES-001 đến RES-008 trong `plan/research-plan.md`).
- Deadline: 02/08/2026 04:59 (Còn 10 ngày).

## 2. Các ý tưởng đã brainstorm

### Ý tưởng 1: NoxSwap — Confidential Liquidity & Swap Router (Được chọn)
- **Mô tả:** Đội định tuyến swap token bảo mật (ERC-7984) qua Uniswap/Curve pools mà không tiết lộ số lượng swap hay vị thế order on-chain.
- **Người dùng mục tiêu:** Institutional traders, DeFi whales, cá nhân muốn tránh MEV Sandwich attacks.
- **Core flow:** Connect wallet -> Select tokens -> Encrypt swap amount (`einput`) -> Nox TEE computes execution -> Settlement với ERC-7984 tokens trên Sepolia.
- **Giá trị khác biệt:** Giữ riêng tư nhưng duy trì 100% tính composability trên EVM Sepolia mà không sửa protocol gốc.
- **Sponsor technology:** `@iexec-nox/nox-confidential-contracts` (ERC-7984), `NoxCompute` TEE, Hardhat starter.
- **Evidence ID:** RES-001, RES-002, RES-004, RES-005.

### Ý tưởng 2: NoxPay — Confidential Payroll & Automated Streaming
- **Mô tả:** Trả lương và stream tiền tự động bảo mật dành cho Web3 DAOs/Startups.
- **Core flow:** Manager thiết lập stream -> Nhập số dư encrypted -> Contributor tự giải mã và claim tiền.
- **Sponsor technology:** Nox ERC-7984 + Nox ACLs cho phép Auditor xem báo cáo thuế.
- **Evidence ID:** RES-001, RES-004.

### Ý tưởng 3: NoxVault — Private Treasury & Portfolio Manager
- **Mô tả:** Quản lý kho quỹ doanh nghiệp bảo mật (Private Gnosis Safe / Treasury Vault).
- **Core flow:** Tạo Vault -> Nạp token mã hóa -> Đề xuất chuyển tiền nội bộ riêng tư.
- **Sponsor technology:** Nox ERC-7984 + Nox TEE state computation.
- **Evidence ID:** RES-002, RES-003.

### Ý tưởng 4: NoxDarkPool — Confidential Off-Chain Order Matching
- **Mô tả:** Sàn khớp lệnh ẩn vị thế mua/bán (Dark pool) dựa trên TEE compute.
- **Rủi ro:** Cần xử lý orderbook phức tạp, thời gian 10 ngày quá gấp.

## 3. Hard Gate Evaluation

| Ý tưởng | Eligibility | Đúng challenge | Web/mobile là core | Công nghệ bắt buộc | Khả thi trước deadline | Có thể demo | Kết quả |
|---|---|---|---|---|---|---|---|
| 1. NoxSwap | Pass | Pass | Pass | Pass | Pass | Pass | **PASS** |
| 2. NoxPay | Pass | Pass | Pass | Pass | Pass | Pass | **PASS** |
| 3. NoxVault | Pass | Pass | Pass | Pass | Pass | Pass | **PASS** |
| 4. NoxDarkPool | Pass | Pass | Pass | Pass | Fail (Quá phức tạp) | Pass | **FAIL** |

## 4. Chấm theo rubric chính thức (Thang 1–5 / Trọng số Sao)

| Ý tưởng | Creativity (⭐⭐⭐) | End-to-End (⭐⭐⭐) | Sepolia Deploy (⭐⭐) | feedback.md (⭐⭐) | Video (⭐⭐) | Technical (⭐) | UX (⭐) | Tổng điểm quy đổi /14 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **1. NoxSwap** | 5/5 (3 sao) | 5/5 (3 sao) | 5/5 (2 sao) | 5/5 (2 sao) | 5/5 (2 sao) | 5/5 (1 sao) | 4/5 (0.8 sao) | **13.8 / 14** |
| **2. NoxPay** | 4/5 (2.4 sao) | 5/5 (3 sao) | 5/5 (2 sao) | 5/5 (2 sao) | 5/5 (2 sao) | 4/5 (0.8 sao) | 4/5 (0.8 sao) | **13.0 / 14** |
| **3. NoxVault** | 3.5/5 (2.1 sao) | 5/5 (3 sao) | 5/5 (2 sao) | 5/5 (2 sao) | 5/5 (2 sao) | 4/5 (0.8 sao) | 4/5 (0.8 sao) | **12.7 / 14** |

## 5. Shortlist trình Người Dùng

1. **Option 1 (Recommended): NoxSwap — Confidential Liquidity & Swap Router**
2. **Option 2: NoxPay — Confidential Payroll & Automated Streaming**
3. **Option 3: NoxVault — Private Treasury & Portfolio Manager**

## 6. Lựa chọn chính thức của Người Dùng

- **Ý tưởng được chọn:** **Option 1: NoxSwap — Confidential Liquidity & Swap Router**
- **Thời điểm chọn:** 2026-07-22T10:46:53+07:00
- **Trạng thái:** Confirmed & Approved. Chuyển sang hoàn thiện `plan/product-plan.md`.
