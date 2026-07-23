# Important Notes

> Trạng thái: Active; updated during implementation validation
> File này quản lý nguồn, deadline, xung đột, rủi ro bị loại và thông tin chưa xác minh.

## 1. Source Register

| Source ID | Tên nguồn | Loại nguồn | File/URL | Đơn vị phát hành | Thời điểm truy cập | Cấp ưu tiên |
|---|---|---|---|---|---|---:|
| SRC-001 | User-provided challenge brief for iExec WTF Hackathon Summer Edition | User-provided | `docs/original/user-provided-challenge-brief.md` | User-provided | 2026-07-21T21:34:36+07:00 | 7 |
| SRC-002 | Safe Smart Account concepts and module architecture | Official technical documentation | `https://docs.safe.global/advanced/smart-account-concepts` | Safe | 2026-07-23 | 4 |

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
| Frontend chưa có URL production đã smoke-test | Internal implementation audit, 2026-07-22 | High | Deploy build hiện tại, kiểm tra MetaMask happy path từ mạng ngoài và ghi URL canonical trước submission. |
| Local Nox integration stack không chạy vì môi trường thiếu Docker | Nox Hardhat plugin runtime check, 2026-07-22 | Low | Dùng compile/unit + live Sepolia E2E; chạy lại local integration trong CI có Docker nếu có. |
| Docker-backed Nox integration workflow chưa có run evidence | Internal implementation validation, 2026-07-23 | Low | Workflow nightly/manual đã được thêm; chạy trên GitHub và giữ tách khỏi required PR checks cho đến khi ổn định. |
| Safe input proofs cannot use a Safe contract as the EOA gateway owner | Live Sepolia smoke test, 2026-07-23 | Closed | Safe owner prepares persistent Nox ACLs in the allowlisted module; only the Safe threshold can trigger settlement and spend treasury balances. |
| Standard Safe cannot receive the router's ERC-721 receipt callback | Live Sepolia smoke test, 2026-07-23 | Closed | Assets and refunds remain in Safe custody; receipt owner is constrained to a verified Safe owner EOA. |

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

## 8. Safe composability validation

- Canonical Sepolia Safe: `0x549585Be4d75b388B4f825E0bCbBaA85B4FbfffF` (Safe v1.4.1, threshold 1).
- Canonical allowlisted Nox module `0xc0c60df5F16196944e466E8bD6BE5220F913b093` and Safe orderbook `0xd8037cb70163eC52aa774f54590BB266ee0d9908` are recorded in `packages/contracts/deployment-sepolia.json`.
- Live protected swap receipt #29 settled 1,000 cUSDC with the 10% default oracle tolerance; Safe balance reveal returned `0.496401483047806904 cETH`.
- Safe confidential order #1 was created and cancelled through the module; the encrypted input was refunded.
- Module revoke and owner-controlled re-enable were both confirmed on Sepolia; the canonical module is enabled after the test.
- Auditor access is per-handle Nox viewer access only and does not grant token operator or Safe signing authority.
- Safe module V3 was deployed in transaction `0xcb3aec532031858fc44e3d298ef3f31e6c8aeff2c91121aedecfe163a5eacfe7`, then enabled after the legacy module was disabled; the existing Safe orderbook was intentionally retained.
- Live Safe unwrap prepared its ciphertext ACL in `0x5d2e2f4ce6675a6d07e39bf112f071238d0894e2d6065de1107f881545104a57`, created request `0x0000aa36a7230112e2da3a5cacbbb742b709eda9b615a3524b7ad30046cd0857` through Safe transaction `0x9751ef8c8f998a3796183c8f03a6168fabae1541293a495307a7cccecd9f5cf7`, and finalized the exact one-base-unit public release in `0x146b9e2d482b137297b6a3ccb806afcddb8736387e9a3f76915df0473f8cde2e`.
