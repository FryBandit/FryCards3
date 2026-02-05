// Safely access environment variables
const env = (import.meta as any)?.env || {};

export const SUPABASE_URL = 'https://eqhuacksgeqywlvtyely.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_n6zRl0hcxM3RxICC5yWGAA_Sv0HWlha'; 

export const RARITY_COLORS: Record<string, string> = {
  Common: 'text-slate-400',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  'Super-Rare': 'text-purple-400',
  Mythic: 'text-orange-400',
  Divine: 'text-yellow-300',
};

export const RARITY_BG: Record<string, string> = {
  Common: 'bg-slate-800',
  Uncommon: 'bg-green-900',
  Rare: 'bg-blue-900',
  'Super-Rare': 'bg-purple-900',
  Mythic: 'bg-orange-900',
  Divine: 'bg-yellow-900',
};

export const MILL_VALUES: Record<string, number> = {
  Common: 10,
  Uncommon: 25,
  Rare: 100,
  'Super-Rare': 250,
  Mythic: 500,
  Divine: 1000
};

export const CARD_BACK_IMAGE = 'https://via.placeholder.com/300x420?text=FryCards';