import { frames, type TextAreaSize, type WishTextRegion } from './frames';

// Dữ liệu giả để thử giao diện. Dữ liệu thật và xác thực sẽ được xử lý ở máy chủ.
export const demoCode = '2026';

const sampleWishes = [
  ['Cô Hoa', '01_Nobita_VayTay.png', 'Minh An', 'Người gửi thường ngồi ở dãy bàn gần cửa sổ.',
    'Em cảm ơn cô vì luôn kiên nhẫn nghe chúng em hỏi. Chúc cô có thật nhiều niềm vui và những ngày lên lớp đầy tiếng cười!'],
  ['Thầy Chín', '06_Chaien_Hat.png', 'Bảo Linh', 'Người gửi từng xung phong thuyết trình ở buổi đầu tiên.',
    'Chúc thầy luôn khỏe và giữ mãi sự hào hứng khi kể cho chúng em nghe về những điều mới. Em rất trân trọng những giờ học của thầy.'],
  ['Thầy Hải', '11_Xeko_ChongHong.png', 'Gia Huy', 'Người gửi thích ghi chú bằng bút màu xanh.',
    'Cảm ơn thầy vì những lần giúp chúng em bình tĩnh gỡ từng lỗi nhỏ. Chúc thầy nhiều sức khỏe và luôn có những dự án thật thú vị!'],
  ['Thầy Hải', '07_Xeko_ChiTay.png', 'Khánh Vy', 'Người gửi từng đến sớm để chuẩn bị máy chiếu.',
    'Em chúc thầy có nhiều thời gian cho những điều mình yêu thích. Cảm ơn thầy đã cho chúng em thấy học điều khó cũng có thể rất vui.'],
  ['Cả ba thầy cô', '16_Shizuka_Doraemon.png', 'Đức Anh', 'Người gửi hay nhận việc chụp ảnh cho nhóm.',
    'Chúc cô Hoa, thầy Chín và thầy Hải luôn mạnh khỏe. Cảm ơn thầy cô đã dành thời gian chỉ bảo và động viên chúng em trong suốt thời gian qua.'],
  ['Cô Hoa', '04_Shizuka_CamHoa.png', 'Thu Nhi', 'Người gửi thích trang trí sổ bằng hình hoa.',
    'Em gửi cô một bó hoa bằng chữ. Chúc cô mỗi ngày đều gặp những điều nhỏ nhưng thật dễ thương!'],
  ['Thầy Chín', '08_Shizuka_VayTay.png', 'Tuấn Kiệt', 'Người gửi từng mang theo một quyển sổ bìa vàng.',
    'Cảm ơn thầy đã khuyến khích chúng em mạnh dạn thử lại sau mỗi lần sai. Em chúc thầy luôn vui và có một học kỳ thật nhẹ nhàng.'],
  ['Cả ba thầy cô', '20_Shizuka_Doraemon_NhinKhung.png', 'Ngọc Hà', 'Người gửi từng viết lời cảm ơn ở cuối bài nộp.',
    'Cảm ơn cả ba thầy cô vì đã đồng hành cùng chúng em. Mong mỗi khi ghé căn phòng này, thầy cô lại nhớ đến một kỷ niệm vui với lớp.'],
  ['Thầy Hải', '14_Chaien_Doraemon.png', 'Quang Minh', 'Người gửi hay phụ các bạn kiểm tra tài liệu trước giờ nộp.',
    'Chúc thầy có thật nhiều năng lượng và những buổi học sôi nổi. Cảm ơn thầy vì đã tin rằng chúng em có thể tự tìm ra cách giải của mình.'],
] as const;

const recipients = ['Cô Hoa', 'Thầy Chín', 'Thầy Hải', 'Cả ba thầy cô'] as const;
const shortWishes = [
  'Em chúc thầy cô luôn mạnh khỏe và có thật nhiều niềm vui mỗi ngày.',
  'Cảm ơn thầy cô đã luôn động viên chúng em. Chúc thầy cô một ngày thật vui!',
  'Mong thầy cô có nhiều kỷ niệm đẹp cùng lớp. Em cảm ơn thầy cô rất nhiều!',
  'Em gửi lời cảm ơn vì những buổi học đáng nhớ. Chúc thầy cô thật nhiều sức khỏe!',
] as const;

export interface WishCard {
  id: number;
  recipient: string;
  image: string;
  messageArea: WishTextRegion;
  nameArea: WishTextRegion;
  author: string;
  hint: string;
  message: string;
  aliases: readonly string[];
}

const textArea = ([left, top, width, height, fontSize]: TextAreaSize): WishTextRegion => ({left, top, width, height, fontSize});

export const cards: readonly WishCard[] = frames.map(([image, messageArea, nameArea], index) => {
  const sample = sampleWishes.find(wish => wish[1] === image);
  const sender = sample ?? sampleWishes[index % sampleWishes.length] ?? sampleWishes[0];
  return {
    id: index + 1,
    recipient: sample?.[0] ?? recipients[index % recipients.length] ?? recipients[0],
    image: `/wish-cards/${image}`,
    messageArea: textArea(messageArea),
    nameArea: textArea(nameArea),
    author: sender[2],
    hint: sender[3],
    message: sample?.[4] ?? shortWishes[(index + Math.floor(index / 4)) % shortWishes.length] ?? shortWishes[0],
    aliases: [],
  };
});
