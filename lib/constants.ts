// DSCSS-ACS 定数定義

export const POINTS_PER_CORRECT = 10;
export const STORAGE_KEY = "dscss_acs_progress";

// 5ステージ定義（AIクラウドセキュリティ）
export const STAGES = [
  {
    id: 1,
    name: "AI・クラウド基礎",
    subtitle: "全社員必須",
    color: "#16a34a",
    emoji: "🟢",
    purpose: "AI・クラウドの基本概念を理解",
  },
  {
    id: 2,
    name: "AIクラウド利活用",
    subtitle: "実務適用",
    color: "#ca8a04",
    emoji: "🟡",
    purpose: "AIクラウドサービスの安全な利用",
  },
  {
    id: 3,
    name: "AIセキュリティ脅威",
    subtitle: "脅威対策",
    color: "#ea580c",
    emoji: "🟠",
    purpose: "AI特有のセキュリティ脅威を理解",
  },
  {
    id: 4,
    name: "AIガバナンス",
    subtitle: "経営・管理層",
    color: "#dc2626",
    emoji: "🔴",
    purpose: "AI活用の経営リスクと規制対応",
  },
  {
    id: 5,
    name: "AI×セキュリティ実践",
    subtitle: "リーダー育成",
    color: "#374151",
    emoji: "⚫",
    purpose: "AIセキュリティの高度な実践力",
  },
];

// 3クラス定義
export const CLASSES = [
  { id: 1, name: "Basic", label: "基礎", color: "#3b82f6", icon: "📘" },
  { id: 2, name: "Standard", label: "標準", color: "#8b5cf6", icon: "📗" },
  { id: 3, name: "Advanced", label: "応用", color: "#ef4444", icon: "📕" },
];

// ランク判定（5ステージ×3クラス×10問×10pt = 1,500pt満点）
export const MAX_POINTS = 1500;
export const QUESTIONS_PER_COURSE = 10;
export const RANKS = [
  { min: 1500, label: "AIマスター認定", color: "#7c3aed", icon: "👑", desc: "1,500pt" },
  { min: 1200, label: "AIセキュリティリーダー", color: "#dc2626", icon: "🏆", desc: "1,200pt〜" },
  { min: 900, label: "AIセキュリティ実践者", color: "#166534", icon: "🛡️", desc: "900pt〜" },
  { min: 450, label: "AI活用推進者", color: "#059669", icon: "📘", desc: "450pt〜" },
  { min: 1, label: "学習中", color: "#64748b", icon: "📖", desc: "1pt〜" },
  { min: 0, label: "未受講", color: "#94a3b8", icon: "—", desc: "0pt" },
];

export function getRank(totalPts: number) {
  return RANKS.find((r) => totalPts >= r.min) ?? RANKS[RANKS.length - 1];
}
