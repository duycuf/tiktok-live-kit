// Người xem giả để thử theme khi chưa live (Test Lab). Đi qua đúng đường ống như live thật.

const NAMES = ['Thảo My', 'Hoàng Dương', 'oanh luu', 'Phúc', 'Thị Lê', 'Li.am', 'Pnthinh', 'Minh Tâm', 'An Nhiên', 'Bảo Ngọc', 'Gia Huy', 'Thanh Tú', 'Kim Chi', 'Đức Anh', 'Hải Yến', 'Quang Vinh', 'Ngọc Hân', 'Trúc Lâm', 'Diệu Linh', 'Văn Khải'];
const CHATS = ['Xin chào mọi người', 'Hay quá', '❤️❤️❤️', 'Chúc kênh nhiều sức khoẻ', 'Lên nào', 'Đỉnh quá', 'Cho xin 1 tim', 'Có ai không'];
const GIFTS = [
  { id: '5655', name: 'Rose', unitCoins: 1 },
  { id: '5487', name: 'Finger Heart', unitCoins: 5 },
  { id: '8913', name: 'Rosa', unitCoins: 10 },
  { id: '6064', name: 'GG', unitCoins: 1 },
  { id: '5585', name: 'Confetti', unitCoins: 100 },
  { id: '7934', name: 'Heart Me', unitCoins: 1 },
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createDemo({ onEvent, extraChats = [] }) {
  let seq = 0;
  let timer = null;
  const known = [];

  const newUser = () => {
    const i = seq++;
    const u = { id: 'demo' + i, uniqueId: 'demo' + i, name: i < NAMES.length ? NAMES[i] : `${pick(NAMES)} ${i}`, avatar: '' };
    known.push(u);
    if (known.length > 400) known.shift();
    return u;
  };
  const someone = () => (known.length && Math.random() < 0.85 ? pick(known) : newUser());

  const make = {
    member: () => ({ kind: 'member', user: newUser() }),
    chat: (text) => ({ kind: 'chat', user: someone(), text: text || pick([...CHATS, ...extraChats]) }),
    like: (n) => ({ kind: 'like', user: someone(), likeCount: n || 1 + Math.floor(Math.random() * 15) }),
    follow: () => ({ kind: 'follow', user: someone() }),
    share: () => ({ kind: 'share', user: someone() }),
    gift: (coins, count = 1) => {
      const g = GIFTS.find((x) => x.unitCoins === Number(coins)) || { id: 'demo-' + coins, name: `Quà ${coins} xu`, unitCoins: Number(coins) || 1 };
      return { kind: 'gift', user: someone(), gift: { ...g, image: '', streakable: false, repeatCount: count, repeatEnd: true, groupId: '' } };
    },
  };

  function fire(kind, arg, arg2) {
    const ev = make[kind]?.(arg, arg2);
    if (ev) onEvent(ev);
  }

  // gifts: false khi đang lên sóng thật: chỉ có người vào, chat, tim cho chùa có không khí, không bày quà giả trước mặt người xem
  function auto(rate = 1, { gifts = true } = {}) {
    stop();
    if (!rate) return;
    timer = setInterval(() => {
      const r = Math.random();
      if (r < 0.25) fire('member');
      else if (r < 0.5) fire('chat');
      else if (r < 0.8 || !gifts) fire('like');
      else if (r < 0.83) fire('follow');
      else fire('gift', pick([1, 1, 1, 1, 5, 5, 10, 100]));
    }, Math.max(80, 700 / rate));
  }

  function stop() { clearInterval(timer); timer = null; }

  return { fire, auto, stop, get running() { return Boolean(timer); }, gifts: GIFTS };
}
