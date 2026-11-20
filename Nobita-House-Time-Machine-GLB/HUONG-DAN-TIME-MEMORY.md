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

**Trong triển lãm:**

- Cỗ máy bắt đầu **Bay tự động** khi lên tàu và tiếp tục qua các vòng. Dùng nút **Bay tự động** để bật hoặc tắt. Cỗ máy dừng chế độ này khi điều khiển thủ công, chọn khu hoặc xem trạm. Với tùy chọn giảm chuyển động, hãy bật chế độ này khi muốn tự bay.
- Giữ W/S để tiến/lùi dọc trục Z. Dùng con lăn hoặc các nút **Tiến** và **Lùi** trên màn hình để di chuyển từng đoạn. Space hoặc nút **Dừng** dừng cỗ máy. Bay tiếp qua Meme Archive sẽ nối sang Học tập & Giảng dạy. Khi bay lùi, đường nối hoạt động theo chiều ngược lại. Thanh tiến độ hiển thị vị trí trong vòng hiện tại.
- M đổi giữa camera **Theo sau** và **Chính diện**. Dùng hai nút nhìn trái/phải để quan sát khung ảnh dọc hai bên.
- Chọn **Bay đến khu** để di chuyển đến một trong 7 khu ngay trong đường hầm. **Tùy chọn → Giảm chuyển động** rút ngắn chuyển động khi chọn khu.
- Nhấp khung 3D, nhấn E khi gần trạm hoặc dùng danh sách **Trạm và album** để chuyển camera sang góc quan sát. Chọn **Xem album** để xem toàn bộ, hoặc nhấp ảnh trong góc quan sát để mở ảnh/video đã chọn. Esc hoặc **Tiếp tục bay** đưa camera về góc bay trước đó.
- Dùng nút Trước/Sau, phím mũi tên hoặc vuốt ngang trên ảnh trong album. Những hoạt động chưa có media công khai vẫn có album cục bộ.
- **Tùy chọn → Về phòng Nobita** đưa bạn về phòng.

**Ảnh và video công khai** đọc từ `public/media/` qua manifest `src/time-journey/memory-manifest.json`. Thư mục `public/memories/` chứa thumbnail tối đa 480 × 360, preview ảnh chủ đạo tối đa 960 × 720, poster video và bản JPEG tương thích trình duyệt cho các tệp HEIC. Cấu hình nhóm và ánh xạ tên thư mục nằm trong `memory-data.ts`. Khi cập nhật media, chạy:

```powershell
python -m pip install Pillow pillow-heif imageio-ffmpeg
python scripts/build-memory-media.py
```

**Ảnh cục bộ** lưu bằng IndexedDB trên trình duyệt đã tải ảnh. Mở ảnh để sửa tiêu đề, mô tả hoặc xóa ảnh. Để tìm ảnh tải lên trước bản triển lãm, chọn **Tùy chọn → Ảnh đã lưu trước đây**. Chọn hoạt động rồi bấm **Gán ảnh** để chuyển ảnh vào album tương ứng. Dữ liệu đọc từ cùng cơ sở dữ liệu và cùng nguồn web (giao thức, tên miền, cổng) đã dùng để lưu ảnh.

Dùng `python scripts/build-memory-media.py --force` khi thay nội dung tệp media và giữ nguyên tên.

Ảnh đầu tiên trong mỗi danh sách của `src/time-journey/memory-curation.json` là ảnh chủ đạo, các mục tiếp theo là preview ưu tiên. Mã của ảnh là tên tệp thumbnail bỏ đuôi `.webp`. Nếu không khai báo, trạm dùng cover album.

Bộ ảnh chụp bốn bố cục desktop và mobile nằm trong [docs/memory-constellation](docs/memory-constellation/README.md).

## Góc lời chúc

Ở phòng Nobita tại `/`, bấm **Góc lời chúc** để xem khung gỗ giữa hai tủ. Bấm trực tiếp vào một thiệp hoặc dùng danh sách **Chọn thiệp**. Khi mở thiệp, có thể nhập tên người gửi hoặc bấm bóng đèn để xem các tên gợi ý. **Về góc phòng** hoặc Esc đưa camera trở lại góc bàn học khi hộp thoại thiệp đã đóng.

Bảng đọc [`src/wishes/loichuc.json`](src/wishes/loichuc.json). File này đã được điền từ `loichuc.csv` và là nơi chỉnh sửa lời chúc sau khi nhập.

- Thêm mục vào mảng `wishes` với `sender` là người gửi, `recipient` là mã người nhận và `message` là lời chúc. Dùng `\n` để xuống dòng trong chuỗi JSON. Bảng có 36 vị trí, theo thứ tự trong mảng.
- Trong `recipients`, sửa `pinColor` bằng mã màu hex. Màu mặc định là vàng cho `ALL` (Tất cả thầy cô), hồng cho `MON` (Cô Mon), xanh dương cho `DUY_HAI` (Thầy Duy Hải) và xanh lá cho `BA_CHIN` (Thầy Ba Chín).
- Đặt `passcode` của mỗi người nhận thành `null` để mở trực tiếp hoặc một chuỗi riêng như `"0123"` để yêu cầu nhập mã. Nhập đúng một lần sẽ mở các thiệp cùng người nhận cho tới khi tải lại trang. Nhóm `ALL` có cấu hình mã riêng.

Passcode hiện điều khiển thao tác mở thiệp trong giao diện. Dữ liệu lời chúc và mã nằm trong bản build gửi tới trình duyệt, nên người xem có thể đọc chúng trong mã nguồn.

Các ảnh thiệp và sticker nằm trong `public/wish-cards/` và `public/wish-reactions/`. `src/wishes/frames.ts` lưu hai vùng chữ và cỡ chữ cho từng ảnh.

## Hình sắc nét hơn

- Cảnh phòng dùng supersampling tối đa 2.25× pixel ratio, có MSAA.
- Texture bộ nhân vật sử dụng anisotropic filtering; vật liệu/GLB nguyên bản được giữ lại.
- Bề mặt phòng của nhà gốc sử dụng anisotropy cho các tile texturing.
- Trong đường hầm, pixel ratio được giới hạn ở 1.5× để giảm tải khi bay giữa các cụm ảnh.

Chất lượng hình học/texture vẫn bị giới hạn bởi GLB gốc. Tăng DPR không biến model phong cách hoạt hình thành mô hình phim chất lượng điện ảnh.

## Tệp chính chỉnh sửa

- `src/time-journey/journey-app.tsx` – hành trình và camera.
- `src/time-journey/machine.tsx` – cỗ máy và 5 nhân vật GLB/animation gốc.
- `src/time-journey/tunnel.tsx` – nền thiên hà, ánh sáng và đồng hồ bay.
- `src/time-journey/gallery.tsx` – album sự kiện, video và ảnh cục bộ.
- `src/time-journey/memory-exhibition.tsx`, `memory-layout.ts` – khung 3D và bố cục theo dữ liệu.
- `src/styles/journey.css` – giao diện hành trình.
- `src/main.tsx`, `src/router.ts` – đặt hành trình làm trang đầu, diorama cũ chuyển sang `/house`.

## Bản quyền

Nguồn gốc: `https://github.com/lnanhkhoa/nobita-house-3d`. Giữ nguyên README và tài nguyên do tác giả cung cấp. Repo gốc ghi là dự án fan không thương mại; việc có file GLB không tự động cấp quyền sử dụng thương mại nhân vật Doraemon. Kiểm tra quyền sử dụng trước khi công bố hoặc khai thác thương mại.

## Kiểm thử

Chạy `npm run typecheck`, `npm run build`, `npm run test` và `npm run lint`. Sau đó kiểm tra trên trình duyệt bằng cách vào Góc lời chúc, mở ngăn bàn, chọn khu, mở ảnh trực tiếp từ khung 3D và quay về phòng.
