# Product Plan

> Trạng thái: Complete — Sẵn sàng phê duyệt

## 1. Approval input

- Ý tưởng được người dùng chọn: **Option 1: NoxSwap — Confidential Liquidity & Swap Router**
- Ngày xác nhận: 2026-07-22
- Điều kiện hoặc thay đổi người dùng yêu cầu: Tối ưu cho Web Client (React + Vite + Wagmi), chạy thật end-to-end trên Ethereum Sepolia không dùng mock data.

## 2. Tên sản phẩm

- Tên: **NoxSwap**
- Tagline: Confidential Liquidity & DEX Swap Router powered by iExec Nox & ERC-7984
- Loại client: Web Application (PWA / Mobile-responsive)

## 3. Problem statement

- Vấn đề: Các giao dịch trên các AMM/DEX công khai (Uniswap, Curve) minh bạch 100%, khiến toàn bộ số tiền swap, slippage và lịch sử số dư bị lộ công khai trên blockchain.
- Ai gặp vấn đề: Institutional traders, DeFi whales, Web3 Companies và người dùng muốn bảo vệ vị thế giao dịch.
- Tại sao vấn đề quan trọng: Việc lộ thông tin khiến người dùng bị dính tấn công MEV (Sandwich attacks, Front-running), copy-trading và không đạt được tính bảo mật thương mại.
- Giải pháp hiện tại chưa tốt ở đâu: Các giải pháp ZK Shielded Pool (như Railgun) hay ZK Rollup (như Aztec) cô lập thanh khoản, làm mất đi tính **DeFi Composability** trên Ethereum.
- Evidence ID: RES-001, RES-004, RES-005.

## 4. Target users

### Người dùng chính

- Mô tả: DeFi Traders & Web3 Institutions.
- Mục tiêu: Thực hiện swap token với số lượng lớn hoặc giữ bí mật vị thế tài sản mà không lo bị front-run.
- Pain points: Bị lộ số dư ví, bị bot MEV ép giá khi swap số lượng lớn trên DEX công khai.

### Người dùng phụ

- Mô tả: DeFi Developers & iExec Nox Community Judges.
- Mục tiêu: Đánh giá khả năng tích hợp thực tế của chuẩn ERC-7984 và lớp TEE compute Nox.
- Pain points: Muốn thấy ứng dụng thật chạy end-to-end trên Sepolia thay vì mô hình lý thuyết.

## 5. Value proposition

> **NoxSwap** giúp **DeFi Traders & Institutions** thực hiện **swap token hoàn toàn bảo mật số lượng và số dư** bằng cách **tích hợp lớp tính toán TEE iExec Nox và chuẩn ERC-7984 trực tiếp trên Ethereum Sepolia mà không làm mất tính composability**.

## 6. Assumptions, constraints và dependencies

| Nội dung | Loại | Căn cứ | Cách xác minh | Ảnh hưởng nếu sai |
|---|---|---|---|---|
| iExec Nox Protocol hỗ trợ deploy và chạy TEE runner trên ETH Sepolia | Dependency | Sponsor Technical Brief | Kiểm tra RPC Sepolia + `NoxCompute` | Medium |
| Chuẩn ERC-7984 hỗ trợ wrap/unwrap từ ERC-20 Sepolia | Constraint | `@iexec-nox/nox-confidential-contracts` | Compile & Test contract local | Low |
| Thời gian phát triển còn 10 ngày trước deadline 02/08/2026 | Constraint | Mốc thời gian do người dùng cung cấp | Bám sát scope MVP | High |

## 7. Core user flow

1. **Connect Wallet**: Người dùng kết nối ví MetaMask / WalletConnect trên mạng Ethereum Sepolia testnet.
2. **Wrap to Confidential (ERC-7984)**: Người dùng chuyển đổi token ERC-20 công khai (như sUSDC) thành token bảo mật `cUSDC` (ERC-7984).
3. **Configure Encrypted Swap**: Người dùng nhập cặp token và số lượng swap. Client SDK (`@iexec-nox/handle`) mã hóa số liệu thành `einput` handle.
4. **Execute Nox TEE Swap**: Gửi giao dịch on-chain. iExec Nox TEE runner tính toán khớp lệnh off-chain trong môi trường Intel TDX an toàn và cập nhật trạng thái encrypted handle trên Sepolia.
5. **Private Balance Decryption**: Người dùng xem số dư mã hóa trên UI và kích hoạt local decryption (giải mã tại trình duyệt) khi cần kiểm tra số dư thực tế.

## 8. MVP

### Must-have

- [x] Giao diện Swap DApp responsive, thiết kế hiện đại, mượt mà (Dark mode + Glassmorphism).
- [x] Kết nối ví Ethereum Sepolia thật (Wagmi/Viem).
- [x] Hợp đồng thông minh ERC-7984 & NoxSwap triển khai trên Sepolia.
- [x] Luồng mã hóa tham số swap (`@iexec-nox/handle`) và gọi TEE compute.
- [x] Chức năng giải mã số dư riêng tư trên UI (Decryption key local).
- [x] Tệp `feedback.md` đóng góp ý kiến cho iExec dev tools trong repo.

### Should-have

- [x] Bảng hiển thị giao dịch gần nhất (Transaction History với encrypted status).
- [x] Faucet nhận Token Test Sepolia mượt mà ngay trên UI.

### Nice-to-have

- [ ] Tích hợp đồ thị giá TradingView cho cặp giao dịch.

## 9. Non-goals

Không xây trong phiên bản hackathon:

- [ ] Ứng dụng Mobile Native (iOS/Android) độc lập — chỉ phát triển Web App đáp ứng Responsive/PWA.
- [ ] Cầu nối Cross-chain sang các blockchain L1 khác ngoài Sepolia.
- [ ] Sàn khớp lệnh Orderbook Darkpool phức tạp ngoài AMM swap routing.

## 10. Sponsor technology

- Công nghệ: **iExec Nox Protocol (`NoxCompute` + ERC-7984 standard + TEE runners)**.
- Vai trò trong core flow: Là lớp tính toán cốt lõi xử lý mã hóa/giải mã và cập nhật trạng thái tài sản riêng tư không bị lộ on-chain.
- Tại sao không phải integration hình thức: Nếu bỏ Nox, ứng dụng chỉ là một DEX công khai lộ số dư. Nox nằm ở core flow xử lý giao dịch.
- Bằng chứng cần thể hiện trong demo: Txhash trên Sepolia Etherscan hiển thị encrypted handle thay vì số tiền plaintext, cùng với quá trình giải mã trên UI.

## 11. Data, privacy và security

- Dữ liệu cần dùng: Số dư ERC-7984 token mã hóa, địa chỉ ví Sepolia.
- Nguồn và quyền sử dụng: Quyền trực tiếp từ ví người dùng kết nối qua EIP-1193.
- Dữ liệu nhạy cảm: Số tiền swap thực tế và số dư cá nhân (được bảo vệ bằng mã hóa handle & TEE).
- Biện pháp bảo vệ tối thiểu: Không lưu trữ private keys hay plaintext data trên server trung gian.

## 12. Acceptance criteria

| Tính năng | Điều kiện hoàn thành | Cách kiểm tra | Evidence cho rubric |
|---|---|---|---|
| Wallet Connection | Kết nối mượt với MetaMask trên Sepolia | Smoke test trên trình duyệt | JUD-002 (End-to-end) |
| ERC-7984 Wrap/Unwrap | Convert thành công ERC-20 <-> cERC-20 | Kiểm tra Tx trên Sepolia Etherscan | JUD-006 (Technical) |
| Confidential Swap | Swap thành công giữa 2 cToken bằng `einput` | Executed transaction log trên Nox | JUD-001 (Creativity), JUD-003 |
| Local Decryption | Số dư riêng tư hiển thị sau khi giải mã local | Kiểm tra UI render state | JUD-007 (UX) |
| Developer Feedback | Tệp `feedback.md` tồn tại trong repo | Kiểm tra file GitHub | JUD-004 (feedback.md) |

## 13. Success metrics cho demo

| Metric | Mục tiêu | Cách đo trong demo |
|---|---|---|
| Thời gian thực hiện Swap | < 15 giây từ khi submit đến khi TEE hoàn tất | Quay screen recording video demo |
| Tính bảo mật số dư | On-chain Etherscan không lộ số dư thực | Mở Etherscan soi giao dịch trong video |
| Thời lượng Video Demo | ≤ 4 phút | Đảm bảo video ngắn gọn, súc tích |

## 14. Demo scenario

- Người dùng demo: Một trader muốn swap 1,000 cUSDC sang cETH trên Sepolia mà không lộ số dư.
- Bước 1: Kết nối ví MetaMask -> Faucet nhận 1,000 Sepolia USDC.
- Bước 2: Nhấn Wrap -> Nhận 1,000 cUSDC (ERC-7984).
- Bước 3: Nhập lệnh Swap 500 cUSDC lấy cETH -> UI mã hóa số tiền thành handle -> Submit Tx.
- Bước 4: TEE iExec Nox thực hiện khớp lệnh -> Xóa dấu vết plaintext -> Cập nhật balance mã hóa.
- Bước 5: Người dùng nhấn "Decrypt Balance" -> UI hiển thị chính xác số dư cETH và cUSDC mới.
- Kết quả cuối: Giao dịch thành công, Sepolia Etherscan chỉ thấy encrypted handles, người dùng sở hữu token mới.

## 15. Landing Page Brief

> Landing page triển khai sau khi Core Product hoàn thành.

- Primary CTA: "Launch NoxSwap App" (Truy cập dApp).
- Secondary CTA: "View GitHub Source & Docs".
- Hero Message: "Trade Any DeFi Asset With True Confidentiality on Ethereum".

## 16. Liên kết với rubric

| Rubric ID | Tính năng/bằng chứng tương ứng | Cách trình bày |
|---|---|---|
| JUD-001 (Creativity ⭐⭐⭐) | Confidential Liquidity & Swap Router qua Nox | Demo trong video & Slide giải thích MEV protection |
| JUD-002 (End-to-End ⭐⭐⭐) | dApp hoạt động 100% trên Sepolia không mock | Walkthrough sản phẩm live |
| JUD-003 (Sepolia Deploy ⭐⭐) | Deployed smart contracts & frontend live | Đưa URL demo & Sepolia address |
| JUD-004 (feedback.md ⭐⭐) | Tệp `feedback.md` đóng góp cho iExec tools | Nộp file trực tiếp trong repo |
| JUD-005 (Video ≤4 min ⭐⭐) | Video demo súc tích dưới 4 phút | Tệp video submission |
| JUD-006 (Technical ⭐) | Sức mạnh TEE iExec Nox + ERC-7984 | Trình bày kiến trúc contract & handle |
| JUD-007 (UX ⭐) | UI/UX giao diện hiện đại, dễ thao tác | Trải nghiệm người dùng 1-click |

## 17. Approval Gate

- [x] Ý tưởng đã được người dùng chọn.
- [x] MVP và non-goals đã được định nghĩa rõ ràng.
- [x] Product Plan sẵn sàng để người dùng xem xét phê duyệt.
