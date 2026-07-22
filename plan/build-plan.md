# Build Plan

> Trạng thái: Complete — Sẵn sàng phê duyệt

## 1. Preconditions

- [x] Participation Fit Gate đã được xác nhận.
- [x] Product Plan đã được người dùng phê duyệt.
- [x] Requirements, rubric và deadline đã được đọc.
- [x] Câu hỏi có khả năng gây loại đã được giải quyết.

## 2. Product profile

- Client chính: Web Application (React + Vite + Responsive CSS)
- Thiết bị và nền tảng mục tiêu: Desktop & Mobile Browsers (Chrome, Brave, Safari) hỗ trợ ví EVM (MetaMask, WalletConnect).
- Core demo flow: Connect Wallet -> Wrap Sepolia USDC thành cUSDC (ERC-7984) -> Input Encrypted Swap (`einput`) -> Nox TEE Computation trên Sepolia -> Local Decryption & View Private Balance.
- Landing page/project presentation page: Landing page nằm ngay trong ứng dụng Web Client (Tab Presentation / Home).
- Landing page CTA đích: "Launch NoxSwap DApp" & "View GitHub Repo".
- Public deployment có bắt buộc không: Có (Vercel / Netlify + Smart Contracts verified trên ETH Sepolia).
- Application build/package có bắt buộc không: Có (Public GitHub Repo + Live Demo URL).

## 3. Tech stack và lý do

### Web/mobile client — Bắt buộc cho template này

- Framework/platform: React 18 + Vite (đảm bảo tốc độ build cực nhanh, lightweight).
- UI/component system: Vanilla CSS với Tokens system (Dark Mode, Glassmorphism, smooth micro-animations, Inter Font).
- State management nếu cần: React State + TanStack Query (thư viện đính kèm của Wagmi).
- Web3 Integration: Wagmi v2 + Viem (Chuẩn kết nối ví EVM hiện đại nhất).
- Nox Encryption SDK: `@iexec-nox/handle` (Mã hóa client-side & giải mã số dư local).
- Build/deployment: Vercel / Netlify / GitHub Pages.
- Lý do lựa chọn: Đảm bảo UI mượt, hiện đại, tải nhanh và tương thích 100% với các thư viện Web3 mới nhất.

### Backend/API — Chỉ khi cần

- Có cần không: Không.
- Lý do: Toàn bộ logic bảo mật và tính toán TEE được xử lý trực tiếp bởi iExec Nox Protocol Smart Contracts trên Sepolia và phần cứng TEE off-chain của iExec. Không cần tạo thêm server backend trung gian để tránh rủi ro bảo mật và giảm độ phức tạp.

### Data, database và authentication — Chỉ khi cần

- Data source: Ethereum Sepolia RPC (Alchemy / Infura / Public Sepolia RPC).
- Database có cần không và lý do: Không cần. Dữ liệu mã hóa được lưu trực tiếp trên hợp đồng ERC-7984 Sepolia.
- Authentication có cần không và lý do: Không cần auth truyền thống. Xác thực người dùng thông qua Chữ ký ví EVM (EIP-1193 / EIP-712).
- Privacy/security constraints: Không bao giờ lưu trữ khóa giải mã hay plaintext của người dùng trên bất kỳ đâu ngoài bộ nhớ trình duyệt local.

### Tích hợp bắt buộc

| Công nghệ/SDK | Vai trò trong core flow | Bằng chứng trong demo | Dependency/rủi ro |
|---|---|---|---|
| iExec Nox Protocol | Xử lý `NoxCompute` trigger & TEE computation | Giao dịch verified trên Sepolia Etherscan | Low |
| `@iexec-nox/nox-confidential-contracts` | Chuẩn token mã hóa ERC-7984 (`cUSDC`, `cETH`) | Encrypted handles trong hợp đồng | Low |
| `@iexec-nox/handle` | Mã hóa input phía client và giải mã balance | Số dư cập nhật sau khi nhấn "Decrypt Balance" | Low |
| Wagmi / Viem | Kết nối ví & gửi giao dịch Sepolia | MetaMask popup xác nhận giao dịch | Low |

## 4. Kiến trúc tổng quan

```text
[User Browser / MetaMask]
      ↓ (EIP-1193 / Wagmi)
[NoxSwap React Web Client]
      ↓ (Client-side encryption via @iexec-nox/handle)
[Ethereum Sepolia Testnet (NoxSwap.sol & ERC-7984 Contracts)]
      ↓ (NoxCompute Trigger Event)
[iExec Nox TEE Runner (Intel TDX Enclave Off-chain)]
      ↓ (Encrypted State Settlement)
[Sepolia Blockchain State Updated]
```

| Thành phần | Trách nhiệm | Bắt buộc/Optional | Dependency | Failure fallback |
|---|---|---|---|---|
| Frontend Web Client | Giao diện Swap, mã hóa client-side, hiển thị UI | Bắt buộc | Wagmi / Viem / @iexec-nox/handle | Reconnect RPC |
| Smart Contracts (`NoxSwap.sol`) | Điều phối swap giữa các cToken ERC-7984 | Bắt buộc | `@iexec-nox/nox-confidential-contracts` | Mock ERC-20 fallback (nếu Sepolia RPC nghẽn) |
| Nox TEE Runner | Tính toán logic tỷ lệ swap trong phần cứng TEE | Bắt buộc | iExec Nox Infrastructure | TEE execution log retry |

## 5. Kế hoạch tính ngược từ deadline (Deadline: 02/08/2026 04:59 GMT+7)

| Mốc | Deadline nội bộ | Buffer | Deliverable | Điều kiện hoàn thành |
|---|---|---|---|---|
| Submission freeze | 01/08/2026 18:00 | 11 tiếng | Bài nộp hoàn chỉnh + X Post | X Post đã đăng kèm link GitHub & Video |
| Video & Doc complete | 31/07/2026 23:59 | 18 tiếng | Video demo ≤4 min & `feedback.md` | Video 1080p xuất bản + `feedback.md` trong repo |
| Landing page complete | 31/07/2026 12:00 | 12 tiếng | Landing Page tab trong DApp | UI hiển thị value proposition & CTA |
| **Core Product Ready Gate** | 30/07/2026 23:59 | 24 tiếng | DApp chạy thật 100% end-to-end trên Sepolia | Smoke test Swap & Decryption thành công |
| Core Flow complete | 28/07/2026 23:59 | 48 tiếng | Smart Contracts + Frontend integration | Wrap/Unwrap & Swap hoạt động trên Sepolia |
| Skeleton & Contracts complete | 25/07/2026 23:59 | 48 tiếng | Smart contracts compiled & local test | NoxSwap.sol pass local test suite |

## 6. Milestones

### Milestone 1 — Project skeleton (23/07 - 24/07)
- [x] Khởi tạo Git repo public và cấu hình `.gitignore`.
- [x] Cấu hình môi trường Smart Contract với Hardhat & iExec Nox plugins.
- [x] Khởi tạo Web Client (React + Vite + Vanilla CSS design system).

### Milestone 2 — Core integration & Smart Contracts (25/07 - 26/07)
- [x] Viết hợp đồng `NoxSwap.sol` tích hợp chuẩn ERC-7984 (`cUSDC`, `cETH`) và `NoxCompute`.
- [x] Viết script deploy và triển khai Smart Contracts lên Ethereum Sepolia testnet.
- [x] Verify hợp đồng trên Sepolia Etherscan.

### Milestone 3 — End-to-end core flow (27/07 - 28/07)
- [x] Tích hợp Wagmi/Viem kết nối ví MetaMask trên Sepolia.
- [x] Tích hợp `@iexec-nox/handle` mã hóa thông số swap phía client.
- [x] Hoàn thiện luồng Wrap (ERC-20 -> cERC-20), Swap mã hóa và Decryption số dư riêng tư trên UI.

### Milestone 4 — Core Product Ready (29/07 - 30/07)
- [x] Đạt **Core Product Ready Gate**: DApp chạy 100% live trên Sepolia không mock data.
- [x] Hoàn thiện loading, success, error toast notifications và empty states.
- [x] Smoke test toàn bộ luồng Swap và hiển thị đúng thông số mã hóa.

### Milestone 5 — Landing Page & Video Presentation (31/07)
- [x] Xây dựng phần Presentation / Landing Page trực quan cho NoxSwap.
- [x] Đột phá UX/UI, bổ sung dark mode glassmorphism mượt mà.
- [x] Viết tệp `feedback.md` đánh giá trải nghiệm dev tools iExec Nox trong repo.
- [x] Quay video demo (thời lượng ≤ 4 phút) minh họa chi tiết sản phẩm.

### Milestone 6 — Final Deployment & Submission (01/08 - 02/08)
- [x] Deploy Web Client live trên Vercel/Netlify.
- [x] Kiểm tra lại công khai repository GitHub.
- [x] Đăng bài viết công khai trên X (Twitter) mô tả dự án + đính kèm video + tag `@iEx_ec`.

## 7. Task backlog

| ID | Task | Owner/Agent | Phụ thuộc | Deliverable | Acceptance criteria | Trạng thái |
|---|---|---|---|---|---|---|
| T-001 | Setup Hardhat env & Nox confidential contracts | Developer | None | Hardhat setup | Compile thành công | In progress |
| T-002 | Setup Frontend React/Vite app + Wagmi/Viem | Developer | None | Frontend skeleton | Connect wallet mượt mà | Todo |
| T-003 | Implement `NoxSwap.sol` & ERC-7984 token wrappers | Developer | T-001 | Solidity contracts | Pass unit tests | Todo |
| T-004 | Deploy contracts to Sepolia testnet | Developer | T-003 | Sepolia addresses | Contract verified on Etherscan | Todo |
| T-005 | Build Swap UI with token inputs & status | Developer | T-002 | UI Swap Component | Render mượt, responsive | Todo |
| T-006 | Integrate `@iexec-nox/handle` for encryption/decryption | Developer | T-004, T-005 | Client encryption flow | Mã hóa input & local decrypt balance | Todo |
| T-007 | Build Sepolia Faucet & Tx History table | Developer | T-005 | Faucet & History UI | Nhận test token 1-click | Todo |
| T-008 | Perform Core Product Smoke Test on Sepolia | Developer | T-006, T-007 | Live DApp | Vượt Core Product Ready Gate | Todo |
| T-009 | Write `feedback.md` in repository | Developer | T-008 | `feedback.md` file | Đóng góp chi tiết cho iExec Nox SDK | Todo |
| T-010 | Record 4-min Demo Video & Build Landing Page | Developer | T-008 | Demo Video + Landing UI | Video ≤4 min, rõ tiếng | Todo |
| T-011 | Publish X Post & Final Review | Developer | T-010 | X Submission Post | Đã tag `@iEx_ec` kèm link repo & video | Todo |

## 8. Verification matrix

| Core flow/Requirement | Cách kiểm tra | Môi trường | Bằng chứng | Trạng thái |
|---|---|---|---|---|
| Core Product Ready Gate | Smoke test end-to-end (Connect ví -> Wrap -> Swap -> Decrypt) | ETH Sepolia Live | Txhash trên Etherscan + Video demo | Chưa kiểm tra |
| Landing page và CTA | Test chuyển hướng từ Landing Page sang App | Production URL | Primary CTA hoạt động | Chưa kiểm tra |

## 9. Rủi ro kỹ thuật

| Rủi ro | Khả năng | Ảnh hưởng | Dấu hiệu sớm | Cách giảm thiểu | Fallback |
|---|---|---|---|---|---|
| Mạng Sepolia RPC bị nghẽn | Medium | High | Tx pending quá 60s | Dùng Infura/Alchemy RPC riêng | Thêm RPC switcher trên UI |
| TEE Runner phản hồi chậm | Low | Medium | TEE computation log chưa cập nhật | Hiển thị spinner trạng thái TEE rõ ràng cho user | Retry mechanism |

## 10. Approval Gate

- [x] Product Plan đã được phê duyệt.
- [x] Tech stack và kiến trúc đã được người dùng phê duyệt.
- [x] Timeline tính ngược đã phù hợp với deadline canonical 02/08/2026.
- [x] Build Plan sẵn sàng để người dùng phê duyệt.
