export interface ReferralLevel {
  level: number;
  name: string;
  minReferrals: number;
  maxReferrals: number;
  image: string;
}

export const REFERRAL_LEVELS: ReferralLevel[] = [
  { level: 1, name: "Patinete do Corre", minReferrals: 0, maxReferrals: 9, image: "/levels/level1_patinete.png" },
  { level: 2, name: "Magrela do Menó", minReferrals: 10, maxReferrals: 19, image: "/levels/level2_magrela.png" },
  { level: 3, name: "CGzinha da Maldade", minReferrals: 20, maxReferrals: 29, image: "/levels/level3_cg.png" },
  { level: 4, name: "Hornet Raiz", minReferrals: 30, maxReferrals: 49, image: "/levels/level4_hornet.png" },
  { level: 5, name: "GS do Patrão", minReferrals: 50, maxReferrals: Infinity, image: "/levels/level5_gs.png" },
];

export const calculateLevel = (totalReferrals: number): number => {
  if (totalReferrals >= 50) return 5;
  if (totalReferrals >= 30) return 4;
  if (totalReferrals >= 20) return 3;
  if (totalReferrals >= 10) return 2;
  return 1;
};

export const getLevelName = (level: number): string => {
  const levelData = REFERRAL_LEVELS.find(l => l.level === level);
  return levelData?.name || "Patinete do Corre";
};

export const getLevelImage = (level: number): string => {
  const levelData = REFERRAL_LEVELS.find(l => l.level === level);
  return levelData?.image || "/levels/level1_patinete.png";
};

export const getLevelData = (level: number): ReferralLevel => {
  return REFERRAL_LEVELS.find(l => l.level === level) || REFERRAL_LEVELS[0];
};

export const getProgressToNextLevel = (totalReferrals: number): number => {
  const currentLevel = calculateLevel(totalReferrals);
  
  if (currentLevel === 5) return 100; // Max level
  
  const currentLevelData = getLevelData(currentLevel);
  const nextLevelData = getLevelData(currentLevel + 1);
  
  const progressInLevel = totalReferrals - currentLevelData.minReferrals;
  const levelRange = nextLevelData.minReferrals - currentLevelData.minReferrals;
  
  return Math.round((progressInLevel / levelRange) * 100);
};

export const getReferralsToNextLevel = (totalReferrals: number): number => {
  const currentLevel = calculateLevel(totalReferrals);
  
  if (currentLevel === 5) return 0; // Max level
  
  const nextLevelData = getLevelData(currentLevel + 1);
  return nextLevelData.minReferrals - totalReferrals;
};

export const getNextLevelName = (currentLevel: number): string | null => {
  if (currentLevel >= 5) return null;
  return getLevelName(currentLevel + 1);
};

export const BASE_REFERRAL_URL = "https://correlegal.com.br";

export const generateReferralLink = (referralCode: string): string => {
  return `${BASE_REFERRAL_URL}/?ref=${referralCode}`;
};
