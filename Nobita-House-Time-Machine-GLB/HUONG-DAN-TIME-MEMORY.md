# HƯỚNG DẪN – Phòng Nobita → Cỗ máy thời gian

## Điểm quan trọng

Dự án này **dựa trên chính ZIP `nobita-house-3d-main.zip` do người dùng cung cấp**. Giữ các trang gốc, không thay model bằng hình khối tự dựng:

- **`/`** – trải nghiệm mới: mở màn bên trong phòng Nobita; bàn học ở phía trước.
- **`/house`** – diorama nhà và khu phố nguyên bản từ repo.
- **`/editor`** – trình chỉnh sửa nhà gốc.
- **`/characters/doraemon`**, `/characters/nobita`, `/characters/shizuka`, `/characters/jaian`, `/characters/suneo` – studio nhân vật GLB/animation gốc.

## Chạy trên Windows

1. Giải nén toàn bộ file ZIP (đừng chạy trực tiếp trong ZIP).
2. Cài Node.js 22.12+ nếu máy chưa có.
3. Chạy `CHAY-WINDOWS.bat` hoặc mở PowerShell trong thư mục có `package.json`:

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

4. Mở `http://localhost:5173/` (đừng mở `index.html` trực tiếp).

> Repo gốc khuyến nghị Bun. Bản tích hợp có cả lệnh npm dành cho người dùng Windows. Cần mạng Internet khi cài thư viện lần đầu.

## Cách sử dụng

**Bắt đầu:** camera đứng trong phòng Nobita thật, bàn học ở phía trước. Nhấn trực tiếp vào ngăn bàn/nhãn 3D hoặc nút “Mở ngăn bàn · Lên cỗ máy”. Camera tiến tới bàn, hiệu ứng mở cổng xuất hiện, sau đó lên cỗ máy trong đường hầm.

**Trong đường hầm:**

- W/S: tiến/lùi; A/D hoặc ←/→: quay; ↑/↓: ngẩng/cúi.
- R/F: lên/xuống; Q/Z: nghiêng; V: cân bằng; Space: phanh.
- M: đổi camera trước/sau để ngắm nhân vật.
- Phím 1–4 hoặc nút Bay đến: tự bay đến cửa ký ức.
- E khi ở gần cửa, nút Xem, hoặc nhấp trực tiếp cửa 3D: mở thư viện.
- Nút “Về phòng Nobita” quay lại điểm xuất phát.

**Ảnh:** nhấn “Thêm ảnh kỷ niệm” trong một cửa. Hình và mô tả được lưu cục bộ bằng IndexedDB trên trình duyệt; không upload lên máy chủ. Có xem chi tiết, sửa tiêu đề và câu chuyện, xóa ảnh.

## Hình sắc nét hơn

- Mặc định bật **Độ nét cao**: render supersampling tối đa 2.25× pixel ratio, có MSAA.
- Texture bộ nhân vật sử dụng anisotropic filtering; vật liệu/GLB nguyên bản được giữ lại.
- Bề mặt phòng của nhà gốc sử dụng anisotropy cho các tile texturing.
- Nút **Độ nét** trên thanh trên cùng chuyển từ Cao sang Tiêu chuẩn khi máy yếu.

Chất lượng hình học/texture vẫn bị giới hạn bởi GLB gốc. Tăng DPR không biến model phong cách hoạt hình thành mô hình phim chất lượng điện ảnh.

## Tệp chính chỉnh sửa

- `src/time-journey/journey-app.tsx` – hành trình và camera.
- `src/time-journey/machine.tsx` – cỗ máy và 5 nhân vật GLB/animation gốc.
- `src/time-journey/tunnel.tsx` – đường hầm 3D và 4 cổng ký ức.
- `src/time-journey/gallery.tsx` – thư viện ảnh cục bộ.
- `src/styles/journey.css` – giao diện hành trình.
- `src/main.tsx`, `src/router.ts` – đặt hành trình làm trang đầu, diorama cũ chuyển sang `/house`.

## Bản quyền

Nguồn gốc: `https://github.com/lnanhkhoa/nobita-house-3d`. Giữ nguyên README và tài nguyên do tác giả cung cấp. Repo gốc ghi là dự án fan không thương mại; việc có file GLB không tự động cấp quyền sử dụng thương mại nhân vật Doraemon. Kiểm tra quyền sử dụng trước khi công bố hoặc khai thác thương mại.

## Kiểm thử

File TSX đã được phân tích cú pháp bằng TypeScript, các GLB đã được kiểm tra tồn tại và chứa các clip animation. **Chưa chạy build WebGL thực tế trong môi trường này** vì không tải được các gói npm; cần xác minh trên máy người dùng sau `npm install`.
