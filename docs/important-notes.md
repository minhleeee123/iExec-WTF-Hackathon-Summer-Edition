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
| MetaMask write flow của build cuối chưa được xác nhận trên URL production | Production deployment and automated smoke test, 2026-07-24 | Low | Build Phase 6 mới đã live và desktop/mobile navigation smoke pass; lặp lại MetaMask happy path trên URL public trước khi quay video. |
| Local Nox integration stack không chạy vì môi trường thiếu Docker | Nox Hardhat plugin runtime check, 2026-07-22 | Low | Dùng compile/unit + live Sepolia E2E; chạy lại local integration trong CI có Docker nếu có. |
| Docker-backed Nox integration workflow chưa có run evidence | Internal implementation validation, 2026-07-23 | Low | Workflow nightly/manual đã được thêm; chạy trên GitHub và giữ tách khỏi required PR checks cho đến khi ổn định. |
| Safe input proofs cannot use a Safe contract as the EOA gateway owner | Live Sepolia smoke test, 2026-07-23 | Closed | Safe owner prepares persistent Nox ACLs in the allowlisted module; only the Safe threshold can trigger settlement and spend treasury balances. |
| Standard Safe cannot receive the router's ERC-721 receipt callback | Live Sepolia smoke test, 2026-07-23 | Closed | Assets and refunds remain in Safe custody; receipt owner is constrained to a verified Safe owner EOA. |
| MCP SDK kéo theo hai advisory moderate của `@hono/node-server` | `npm audit --omit=dev`, 2026-07-24 | Low | MCP chỉ chạy stdio trên Linux và không khởi tạo static HTTP server bị ảnh hưởng; không force downgrade SDK, theo dõi bản vá tương thích upstream. |

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
- Canonical allowlisted Nox module V5 `0xF68B864b600dBb8cbCB7524899bF79B2ec2Dfbe2` and Safe orderbook `0xd8037cb70163eC52aa774f54590BB266ee0d9908` are recorded in `packages/contracts/deployment-sepolia.json`.
- Live protected swap receipt #29 settled 1,000 cUSDC with the 10% default oracle tolerance; Safe balance reveal returned `0.496401483047806904 cETH`.
- Safe confidential order #1 was created and cancelled through the module; the encrypted input was refunded.
- Module revoke and owner-controlled re-enable were both confirmed on Sepolia; the canonical module is enabled after the test.
- Auditor access is per-handle Nox viewer access only and does not grant token operator or Safe signing authority.
- Safe module V5 was deployed in transaction `0xe3017ef17fa515cbe50787fe775b1ead860b2b420a97fd23f36168528f3ad70a`, enabled in `0x1259be1fabe9501c066afe4a41cd21f51f8fd3cafe0fa8d647fa9f66e1ac6bfb`, and the preceding module was disabled only after V5 became active; the existing Safe orderbook was intentionally retained.
- V5 prompt-optimization evidence includes two ciphertext inputs prepared in one transaction (`0x1fe24270bdc0f75d553caf9f0cfa059a15c24a721c0bdbc2c9d9bfd0a351bc2a`) and a prevalidated Safe batch-viewer execution (`0x85212298df23eff1af488c7ceeb586875d04b018c15ee497dc9300647124fc33`).
- Live receipt #32 verified automatic router-operator restoration, output/refund viewer ACLs, refreshed input/output balance ACLs, and post-indexing decryption through V5; the final passing regression settled in Safe transaction `0x0954954a2c297a8e4227da9bceb77aa60b3ba8b657f98b1ceacdef09d4431cbb`.
- Live Safe unwrap prepared its ciphertext ACL in `0x5d2e2f4ce6675a6d07e39bf112f071238d0894e2d6065de1107f881545104a57`, created request `0x0000aa36a7230112e2da3a5cacbbb742b709eda9b615a3524b7ad30046cd0857` through Safe transaction `0x9751ef8c8f998a3796183c8f03a6168fabae1541293a495307a7cccecd9f5cf7`, and finalized the exact one-base-unit public release in `0x146b9e2d482b137297b6a3ccb806afcddb8736387e9a3f76915df0473f8cde2e`.
- Safe Treasury is exposed at `/app/safe` as a first-level workspace. The Wallet tab was removed without removing Wallet Assets or Auditor Access; `/app/wallet?tab=safe` redirects to the new route for compatibility.
- The Safe workspace intentionally has no Overview section: Safe identity, owner threshold, module/signer state, four encrypted balances, reveal, and funding are consolidated in its compact custody header above Swap & Unwrap, Orders & Agent, Activity, and Access & Security.
- Optimized frontend deployment `dpl_2V4VBBFrYGfGfnD1qDouUo4STfiA` is READY and aliased to `https://noxswap-iexec.vercel.app`; `/`, `/docs`, `/app/wallet`, `/app/safe`, `robots.txt`, and `sitemap.xml` returned HTTP 200, and a production browser smoke confirmed the enabled V5 owner context and canonical module address.
