# Build Plan

> Trạng thái: Chờ Product Plan được phê duyệt
> Workspace Generator không tự chọn tech stack, milestone hoặc phê duyệt file này.

## 1. Preconditions

- [ ] Participation Fit Gate đã được xác nhận.
- [ ] Product Plan đã được người dùng phê duyệt.
- [ ] Requirements, rubric và deadline đã được đọc.
- [ ] Câu hỏi có khả năng gây loại đã được giải quyết.

## 2. Product profile

- Client chính: Web / Mobile / PWA
- Thiết bị và nền tảng mục tiêu:
- Core demo flow:
- Landing page/project presentation page:
- Landing page CTA đích:
- Public deployment có bắt buộc không:
- Application build/package có bắt buộc không:

## 3. Tech stack và lý do

### Web/mobile client — Bắt buộc cho template này

- Framework/platform:
- UI/component system:
- State management nếu cần:
- Testing:
- Build/deployment:
- Lý do lựa chọn:

### Backend/API — Chỉ khi cần

- Có cần không: Có / Không
- Lý do:
- Framework/runtime:
- API chính:
- Testing:
- Deployment nếu cần:

### Data, database và authentication — Chỉ khi cần

- Data source:
- Database có cần không và lý do:
- Authentication có cần không và lý do:
- Privacy/security constraints:

### Tích hợp bắt buộc

| Công nghệ/SDK | Vai trò trong core flow | Bằng chứng trong demo | Dependency/rủi ro |
|---|---|---|---|
|  |  |  |  |

Không thêm backend, database, authentication hoặc deployment nếu chúng không phục vụ requirement, core flow hoặc submission.

## 4. Kiến trúc tổng quan

Liệt kê đúng các thành phần thực tế; không mặc định phải có backend hoặc database.

```text
[User]
  ↓
[Web/Mobile/PWA client]
  ↓
[Các service thực sự cần thiết]
```

| Thành phần | Trách nhiệm | Bắt buộc/Optional | Dependency | Failure fallback |
|---|---|---|---|---|
|  |  |  |  |  |

## 5. Kế hoạch tính ngược từ deadline

| Mốc | Deadline nội bộ | Buffer | Deliverable | Điều kiện hoàn thành |
|---|---|---|---|---|
| Submission freeze |  |  |  |  |
| Video/slide complete |  |  |  |  |
| Landing page complete |  |  |  |  |
| Core Product Ready Gate |  |  |  |  |
| Feature freeze |  |  |  |  |
| Core flow complete |  |  |  |  |

Không tự điền thời gian nếu deadline hoặc múi giờ chưa được xác minh.

## 6. Milestones

### Milestone 1 — Project skeleton

- [ ] Web/mobile client chạy trên môi trường mục tiêu.
- [ ] Environment variables và setup được mô tả.
- [ ] Build cơ bản thành công.

### Milestone 2 — Core integration và data

- [ ] Dữ liệu hoặc API cần thiết hoạt động.
- [ ] Sponsor technology được tích hợp vào core flow.
- [ ] Có xử lý lỗi và fallback tối thiểu.

### Milestone 3 — End-to-end core flow

- [ ] Luồng chính chạy từ đầu đến cuối.
- [ ] Có dữ liệu demo ổn định.
- [ ] Có loading, empty, error và success state phù hợp.

### Milestone 4 — Core Product Ready

- [ ] Core UI và interaction đã hoàn thành.
- [ ] Chức năng bắt buộc hoạt động end-to-end.
- [ ] Backend, API và sponsor technology cần thiết hoạt động.
- [ ] Trải nghiệm phù hợp với thiết bị mục tiêu.
- [ ] Không có nút giả hoặc placeholder chưa hoàn thiện.
- [ ] Loading, empty, error và success state đã có khi phù hợp.
- [ ] Không còn blocker nghiêm trọng trong core flow.
- [ ] Core flow vượt qua smoke test.
- [ ] Bằng chứng cho rubric có thể quan sát được.
- [ ] Feature list cuối cùng và nội dung có thể công bố đã được xác nhận.
- [ ] Có thể tạo screenshot hoặc video từ sản phẩm thật.

Không bắt đầu Milestone 5 nếu bất kỳ điều kiện bắt buộc nào của `Core Product Ready Gate` chưa đạt.

### Milestone 5 — Landing Page

- [ ] Nội dung phản ánh đúng Product Plan và sản phẩm đã xây.
- [ ] Hero giải thích rõ vấn đề, giải pháp, value proposition và CTA.
- [ ] Có phần mô tả core flow và các tính năng thực tế.
- [ ] Sponsor technology được mô tả chính xác khi phù hợp.
- [ ] Screenshot hoặc video được lấy từ sản phẩm thật.
- [ ] Primary CTA mở đúng demo, application hoặc deliverable.
- [ ] Repository và liên kết submission hoạt động nếu cần.
- [ ] Responsive và accessibility cơ bản đạt yêu cầu.
- [ ] Không có số liệu, testimonial, claim hoặc tính năng chưa được xác minh.
- [ ] Landing page có smoke test.

### Milestone 6 — Final Deployment hoặc distributable build, nếu cần

- [ ] Application URL/build hoạt động theo yêu cầu submission.
- [ ] Landing page hoạt động trên URL hoặc package dự kiến.
- [ ] CTA từ landing page tới application/deliverable hoạt động.
- [ ] Quyền truy cập được kiểm tra như người chấm.
- [ ] Không lộ secret hoặc dữ liệu nhạy cảm.

### Milestone 7 — Submission

- [ ] Hoàn thành mọi mục bắt buộc trong `docs/requirements.md`.
- [ ] Slide, video và description nhất quán với sản phẩm.
- [ ] Form submission được kiểm tra trước submission freeze.

## 7. Task backlog

| ID | Task | Owner/Agent | Phụ thuộc | Deliverable | Acceptance criteria | Trạng thái |
|---|---|---|---|---|---|---|
| T-001 |  |  |  |  |  | Todo |

## 8. Verification matrix

| Core flow/Requirement | Cách kiểm tra | Môi trường | Bằng chứng | Trạng thái |
|---|---|---|---|---|
| Core Product Ready Gate | Smoke test end-to-end |  |  | Chưa kiểm tra |
| Landing page và CTA | Smoke test presentation-to-product |  |  | Chưa kiểm tra |

## 9. Rủi ro kỹ thuật

| Rủi ro | Khả năng | Ảnh hưởng | Dấu hiệu sớm | Cách giảm thiểu | Fallback |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 10. Change control

- Không tự thay đổi stack hoặc Product Plan.
- Không thêm feature lớn ngoài MVP.
- Mỗi task phải có acceptance criteria.
- Sau mỗi milestone phải chạy kiểm tra phù hợp.
- Mọi thay đổi phạm vi phải ghi tác động tới deadline, demo và rubric.
- Ưu tiên core demo flow trước phần mở rộng.
- Không bắt đầu landing page trước khi Core Product Ready Gate đạt.
- Nếu core product phát sinh blocker nghiêm trọng, tạm dừng landing page và ưu tiên sửa sản phẩm.

## Approval Gate

- [ ] Product Plan đã được phê duyệt.
- [ ] Landing Page Brief đã được chấp thuận trong Product Plan.
- [ ] Tech stack và kiến trúc đã được người dùng phê duyệt.
- [ ] Timeline và buffer đã được kiểm tra với deadline canonical.
- [ ] Build Plan đã được người dùng phê duyệt.
