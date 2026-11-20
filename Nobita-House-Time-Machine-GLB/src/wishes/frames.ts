// [image, message area, sender name area]
// Each area is [left %, top %, width %, height %, maximum font size in px].
export type TextAreaSize = readonly [
  left: number, top: number, width: number, height: number, fontSize: number,
];

export interface WishTextRegion {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
}

export const frames: ReadonlyArray<readonly [string, TextAreaSize, TextAreaSize]> = [
  ['01_Nobita_VayTay.png', [39, 24, 49, 45, 18], [39, 70, 49, 11, 19]],
  ['25_Doraemon_VayTay.png', [39, 19, 49, 44, 18], [39, 64, 49, 11, 19]],
  ['04_Shizuka_CamHoa.png', [21, 23, 43, 36, 16], [21, 60, 43, 11, 17]],
  ['03_Xeko_ThoDau.png', [16, 45, 67, 25, 16], [16, 71, 67, 9, 19]],
  ['22_Doraemon_CamBang.png', [42, 33, 48, 39, 18], [42, 73, 48, 11, 19]],
  ['06_Chaien_Hat.png', [15, 25, 34, 37, 16], [15, 63, 34, 11, 17]],
  ['29_Doraemon_NguSao.png', [15, 20, 62, 26, 18], [15, 47, 62, 9, 19]],
  ['08_Shizuka_VayTay.png', [14, 22, 40, 40, 16], [14, 63, 40, 11, 17]],
  ['38_Doraemon_LoaVangMoi.png', [12, 13, 75, 24, 16], [12, 38, 75, 9, 19]],
  ['34_Doraemon_MayBay.png', [20, 39, 61, 28, 18], [20, 68, 61, 9, 19]],
  ['02_Chaien_Ngo.png', [18, 23, 39, 34, 16], [18, 58, 39, 11, 17]],
  ['01_01_Doraemon_VongVang.png', [40, 49, 50, 25, 16], [45, 75, 40, 10, 18]],
  ['20_Shizuka_Doraemon_NhinKhung.png', [19, 22, 65, 22, 16], [19, 45, 65, 9, 19]],
  ['24_Doraemon_ThoDau.png', [16, 43, 68, 29, 18], [16, 73, 68, 9, 19]],
  ['35_Doraemon_Dorami.png', [38, 35, 33, 36, 16], [38, 72, 33, 11, 17]],
  ['07_Xeko_ChiTay.png', [48, 18, 40, 50, 16], [48, 69, 40, 11, 17]],
  ['31_BaDoraemon_VuiVe.png', [16, 22, 67, 24, 16], [16, 47, 67, 9, 19]],
  ['11_Xeko_ChongHong.png', [14, 19, 54, 51, 18], [14, 71, 54, 11, 19]],
  ['04_04_Doraemon_QuayLung.png', [44, 52, 48, 26, 16], [50, 79, 38, 10, 17]],
  ['28_Doraemon_CuaThanKy.png', [13, 20, 47, 46, 18], [13, 67, 47, 11, 19]],
  ['16_Shizuka_Doraemon.png', [24, 48, 55, 26, 17], [32, 75, 38, 10, 18]],
  ['02_02_Bon_HuyHieu.png', [14, 43, 71, 28, 18], [14, 72, 71, 9, 19]],
  ['26_Doraemon_TuaKhung.png', [14, 24, 47, 43, 18], [14, 68, 47, 11, 19]],
  ['14_Chaien_Doraemon.png', [38, 14, 51, 29, 16], [50, 44, 35, 9, 18]],
  ['30_Doraemon_BongBong.png', [18, 24, 31, 37, 16], [19, 62, 31, 10, 17]],
  ['05_05_Doraemon_LoaVang.png', [20, 20, 31, 36, 16], [25, 57, 27, 10, 17]],
  ['32_Doraemon_ChuongVang.png', [40, 23, 41, 42, 16], [40, 66, 41, 11, 17]],
  ['23_Doraemon_DapXe.png', [46, 20, 42, 44, 16], [46, 65, 42, 11, 17]],
  ['06_06_Doraemon_ThoiBong.png', [12, 24, 39, 41, 16], [15, 66, 34, 10, 17]],
  ['33_Doraemon_LuotSong.png', [15, 23, 49, 36, 18], [17, 60, 45, 10, 18]],
  ['08_08_Ba_Doraemon.png', [16, 22, 69, 18, 16], [16, 41, 69, 9, 19]],
  ['27_Doraemon_BayChongChong.png', [42, 27, 40, 35, 16], [46, 63, 34, 10, 17]],
  ['07_07_Doraemon_GocTren.png', [16, 25, 56, 19, 16], [16, 45, 56, 9, 19]],
  ['36_Doraemon_BanhRan.png', [34, 22, 48, 40, 18], [34, 63, 48, 11, 19]],
  ['21_Doraemon_NhayBenPhai.png', [16, 28, 42, 35, 16], [16, 64, 42, 11, 17]],
  ['03_03_Doraemon_Ngu.png', [15, 19, 69, 22, 16], [15, 42, 69, 9, 19]],
];
