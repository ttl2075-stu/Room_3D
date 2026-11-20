import manifest from './memory-manifest.json';

export interface MemoryMedia {
  kind: 'image' | 'video';
  src: string;
  preview: string;
}

type Layout = 'gallery' | 'research' | 'showcase' | 'landscape' | 'polaroid' | 'milestone' | 'screens';

export interface MemoryEvent {
  id: string;
  zoneId: string;
  title: string;
  description?: string;
  date?: string;
  cover?: MemoryMedia;
  images: MemoryMedia[];
  videos: MemoryMedia[];
  layout: Layout;
}

export interface MemoryZone {
  id: string;
  title: string;
  color: string;
  length: number;
  events: MemoryEvent[];
}

type Folder = keyof typeof manifest;
type EventSpec = [id: string, title: string, folder?: Folder];

function zone(
  id: string,
  title: string,
  color: string,
  length: number,
  layout: Layout,
  specs: EventSpec[],
): MemoryZone {
  return {
    id,
    title,
    color,
    length,
    events: specs.map(([eventId, eventTitle, folder]) => {
      const media = folder ? manifest[folder] : [];
      const images = media
        .filter(({ kind }) => kind === 'image')
        .map((item) => ({ ...item, kind: 'image' as const }));
      const videos = media
        .filter(({ kind }) => kind === 'video')
        .map((item) => ({ ...item, kind: 'video' as const }));
      return {
        id: eventId,
        zoneId: id,
        title: eventTitle,
        layout,
        cover: images[0] ?? videos[0],
        images,
        videos,
      };
    }),
  };
}

export const MEMORY_ZONES = [
  zone('learning', 'Học tập & Giảng dạy', '#81c3ff', 18, 'gallery', [
    ['study-seminar', 'Tọa đàm PP học tập và NCKH cho SV', '20260300 - Tọa đàm PP học tập và NCKH cho SV'],
    ['summer-school', 'Trường hè', '20260700 - Trường hè'],
    ['hvan', 'Tập huấn HVAN', '20261110 - Tập huấn HVAN'],
    ['teaching', 'Các hoạt động thực nghiệm, dạy học'],
  ]),
  zone('research', 'Nghiên cứu & Học thuật', '#bda2ff', 22, 'research', [
    ['faculty-research', 'NCKH cấp khoa', '20260400 - NCKH cấp khoa'],
    ['university-research', 'Báo cáo NCKH cấp trường', '20260500 - Báo cáo NCKH cấp trường'],
    ['presentations', 'Thuyết trình mùa 3', '20260600 - Thuyết trình mùa 3'],
    ['sshe', 'Hội thảo Khoa học quốc tế SSHE', '20261000 - Hội thảo Khoa học quốc tế SSHE'],
    ['conferences', 'Tham gia các hội nghị, hội thảo', 'Tham gia các hội nghị, hội thảo'],
  ]),
  zone('achievements', 'Thành tựu & Sản phẩm', '#f9de86', 15, 'showcase', [
    ['certificates', 'Giấy khen, giấy chứng nhận'],
    ['nvsp', 'Triển lãm NVSP-HNUE 2026', '20261117 - Triển lãm NVSP-HNUE 2026'],
    ['projects', 'Media các sản phẩm làm được'],
  ]),
  zone('journeys', 'Hành trình & Trải nghiệm', '#87e6b1', 18, 'landscape', [
    ['tam-dao', 'Tam Đảo', '20251101 - Tam đảo'],
    ['vinh-phuc', 'Vĩnh Phúc', '20241101 - Vĩnh Phúc'],
    ['extracurricular', 'Các hoạt động ngoại khóa'],
    ['outings', 'Đi chơi', '20260314 - Du xuân'],
  ]),
  zone('celebrations', 'Sinh nhật & Party', '#ff9cc5', 25, 'polaroid', [
    ['thu', 'Sinh nhật Thư', '20260200 - Sinh nhật Minh Thư'],
    ['khoa', 'Sinh nhật Khoa K73', '20260323 - Sinh nhật Khoa K73'],
    ['duy-anh', 'Sinh nhật Duy Anh K74', '20260602 - Sinh nhật Duy Anh K73'],
    ['long', 'Sinh nhật Long K73', '20260720 - Sinh nhật Long K73'],
    ['loc', 'Sinh nhật Lộc K73', '20260828 - Sinh nhật Gia Lộc K73'],
    ['nhi', 'Sinh nhật Nhi K73', '20261117 - Sinh nhật Yến Nhi K73'],
    ['party', 'Party', 'Party'],
  ]),
  zone('milestones', 'Tập thể & Dấu mốc', '#ffbc77', 14, 'milestone', [
    ['opening', 'Khai giảng 2026', '20260905 - Khai giảng 2026'],
    ['group', 'Hình ảnh tập thể'],
  ]),
  zone('meme', 'Meme Archive', '#82eef7', 10, 'screens', [['memes', 'Meme', 'Meme']]),
];

export const MEMORY_EVENTS = MEMORY_ZONES.flatMap(({ events }) => events);
export const LEGACY_ALBUMS = ['Ngày đầu gặp gỡ', 'Những chuyến đi', 'Khoảnh khắc đẹp', 'Lời hẹn tương lai'];
