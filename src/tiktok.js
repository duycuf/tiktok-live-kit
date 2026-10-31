// Chuyển dữ liệu thô của tiktok-live-connector về một dạng gọn, ổn định cho overlay.
// Thư viện đổi tên trường giữa các bản (giftDetails/gift, likeCount/count...), nên đọc phòng thủ.

const firstUrl = (img) => img?.urlList?.[0] || img?.mUrls?.[0] || img?.url_list?.[0] || '';

export function normUser(u = {}) {
  const id = String(u.uniqueId || u.displayId || u.userId || u.id || u.nickname || 'an-danh');
  return {
    id,
    name: u.nickname || u.uniqueId || u.displayId || 'Ẩn danh',
    avatar: u.profilePictureUrl || firstUrl(u.avatarThumb) || firstUrl(u.avatarMedium) || '',
  };
}

export function normGift(data) {
  const d = data.giftDetails || data.gift || {};
  const ext = data.extendedGiftInfo || {};
  return {
    giftId: String(data.giftId ?? d.id ?? ''),
    name: d.giftName || d.name || ext.name || 'Quà',
    image: firstUrl(d.giftImage) || d.giftImage?.giftPictureUrl || firstUrl(d.image) || firstUrl(ext.image) || '',
    coins: Number(d.diamondCount ?? ext.diamond_count ?? data.diamondCount ?? 1) || 1,
    streakable: Number(d.giftType ?? d.type ?? ext.type) === 1,
    repeatCount: Number(data.repeatCount) || 1,
    repeatEnd: Boolean(data.repeatEnd),
    groupId: String(data.groupId ?? ''),
  };
}

export const likeCount = (data) => Number(data.likeCount ?? data.count) || 1;
export const totalLikes = (data) => Number(data.totalLikeCount ?? data.total) || 0;
export const viewerCount = (data) => Number(data.viewerCount ?? data.total ?? data.totalUser) || 0;
