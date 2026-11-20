# Memory Constellation Gallery

Bốn ảnh mẫu chụp trong chế độ quan sát trên Chrome. Desktop dùng khung 1200 × 760, mobile dùng 390 × 844.

| Bố cục | Trạm mẫu | Desktop | Mobile |
| --- | --- | --- | --- |
| Editorial Gallery | NCKH cấp khoa | [Ảnh desktop](desktop-editorial.jpg) | [Ảnh mobile](mobile-editorial.jpg) |
| Hero Gallery | Tam Đảo | [Ảnh desktop](desktop-hero.jpg) | [Ảnh mobile](mobile-hero.jpg) |
| Memory Collage | Sinh nhật Khoa K73 | [Ảnh desktop](desktop-collage.jpg) | [Ảnh mobile](mobile-collage.jpg) |
| Media Showcase | Meme | [Ảnh desktop](desktop-showcase.jpg) | [Ảnh mobile](mobile-showcase.jpg) |

## Thay đổi mã nguồn

| Tệp | Thay đổi |
| --- | --- |
| `src/time-journey/memory-layout.ts` | Bốn cấu hình trạm, tính tỷ lệ ảnh và khoảng hở, đổi bên liên tục dọc ray. |
| `src/time-journey/memory-exhibition.tsx`, `memory-frame.tsx` | Trạm 3D, ray nối, khung mỏng, tiêu đề và poster video. |
| `src/time-journey/journey-app.tsx`, `memory-navigation.tsx`, `src/styles/journey.css` | Quan sát trạm, điều hướng bàn phím/cảm ứng và phục hồi góc bay sau khi xem. |
| `src/time-journey/memory-data.ts`, `memory-curation.json`, `memory-manifest.json` | Chọn ảnh chủ đạo và ảnh phụ, giữ 26 album, bổ sung kích thước ảnh. |
| `src/time-journey/tunnel.tsx` | Tạm ẩn đồng hồ trong góc quan sát để chúng không che tiêu đề. |
| `src/time-journey/gallery.tsx` | Bỏ bảng giữ chỗ trong album chưa có media công khai. |
| `scripts/build-memory-media.py`, `public/memories/*-feature.webp` | Preview ảnh chủ đạo đến 960 × 720. Thumbnail hiện có đến 480 × 360. |
| `src/time-journey/memory-layout.test.ts` | Kiểm tra tỷ lệ, chống chồng khung, khoảng trống cho cỗ máy và chọn ảnh chủ đạo. |

Bảy khu có 26 album. Trong số đó, 21 album có media công khai và tạo trạm 3D. Năm album còn lại có thể mở từ **Trạm và album** để xem hoặc thêm ảnh cục bộ.

## Kiểm thử

- TypeScript và Vite production build thành công.
- Vitest đạt 224/224 với `npm run test -- --testTimeout=45000 --maxWorkers=2`. Bài `lawn-placement` có lần vượt timeout mặc định 5 giây.
- Chrome kiểm tra mở ảnh trực tiếp từ khung 3D, poster và video, phím E/Esc, quay lại góc bay, điều khiển cảm ứng, thiệp trong phòng và tải ảnh vào album cục bộ.
