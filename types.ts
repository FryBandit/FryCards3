export interface Profile {
  id: string;
  username: string;
  gold_balance: number;
  gem_balance: number;
  xp: number;
  level: number;
  packs_opened: number;
  pity_counter: number;
  daily_streak: number;
  last_daily_claim: string | null;
}

export interface Card {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Super-Rare' | 'Mythic' | 'Divine';
  card_type: string;
  image_url: string;
  is_video: boolean;
  flavor_text?: string;
  description?: string;
  is_new?: boolean;
  quantity?: number;
  set_name?: string;
  is_foil?: boolean;
  first_acquired?: string;
}

export interface PackType {
  id: string;
  name: string;
  description: string;
  cost_gold: number | null;
  cost_gems: number | null;
  card_count: number;
  guaranteed_rarity: string | null;
  image_url: string;
}

export interface Mission {
  id: string;
  mission_type: string;
  description: string;
  progress: number;
  target: number;
  reward_gold: number;
  reward_gems: number;
  reward_xp: number;
  is_completed: boolean;
  completion_percentage: number;
}

export interface DashboardData {
  profile: Profile;
  stats: {
    total_cards: number;
    unique_cards: number;
    total_possible: number;
    completion_percentage: number;
    rarity_breakdown: any[];
    set_completion: any[];
  };
  missions: Mission[];
  can_claim_daily: boolean;
}

export interface PackResult {
  success: boolean;
  cards: Card[];
  new_card_count: number;
  xp_gained: number;
  pity_triggered: boolean;
  next_pity_in: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  unique_cards?: number;
  total_cards?: number;
  completion_percentage?: number;
  level?: number;
  xp?: number;
  packs_opened?: number;
}

export interface AffordabilityCheck {
  can_afford: boolean;
  cost_gold: number | null;
  cost_gems: number | null;
  user_gold: number;
  user_gems: number;
  gold_needed: number;
  gems_needed: number;
}

export interface DailyRewardResult {
  success: boolean;
  gold_earned: number;
  gems_earned: number;
  streak: number;
  next_claim_available: string;
}
