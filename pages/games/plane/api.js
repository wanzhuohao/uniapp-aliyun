// 排行榜 API - 本地存储版本

const SCORES_KEY = 'plane_leaderboard_scores';

export async function submitScore({ kills, level, time }) {
  // 本地存储排行榜
  const scores = uni.getStorageSync(SCORES_KEY) || [];

  // 计算评分：击杀*10 + 等级*50 + 时长*2
  const score = kills * 10 + level * 50 + Math.floor(time / 10) * 2;

  const record = {
    kills,
    level,
    time,
    score,
    timestamp: Date.now()
  };

  scores.push(record);

  // 按评分排序，保留前 50 名
  scores.sort((a, b) => b.score - a.score);
  const top50 = scores.slice(0, 50);

  uni.setStorageSync(SCORES_KEY, top50);

  // 计算当前排名
  const rank = top50.findIndex(s => s.timestamp === record.timestamp) + 1;

  return { rank, score };
}

export async function getLeaderboard(limit = 50) {
  const scores = uni.getStorageSync(SCORES_KEY) || [];
  return scores.slice(0, limit);
}
