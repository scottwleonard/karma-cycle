export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  /** Minimum total karma required to see this quest */
  minKarma: number;
  /** Wealth cost to start the quest, given current karma */
  costFn: (karma: number) => number;
  /** Wealth reward on completion, given current karma */
  rewardFn: (karma: number) => number;
  /** Duration in seconds */
  durationSeconds: number;
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'alms_round',
    name: 'Alms Round',
    description: 'Walk the village offering food and blessings to those in need.',
    minKarma: 0,
    costFn: (k) => Math.max(5, Math.floor(Math.sqrt(k) * 2)),
    rewardFn: (k) => Math.max(20, Math.floor(Math.sqrt(k) * 8)),
    durationSeconds: 60,
  },
  {
    id: 'tend_sick',
    name: 'Tend the Sick',
    description: 'Care for the ill in the local monastery, healing body and spirit.',
    minKarma: 200,
    costFn: (k) => Math.floor(Math.sqrt(k) * 6),
    rewardFn: (k) => Math.floor(Math.sqrt(k) * 28),
    durationSeconds: 120,
  },
  {
    id: 'build_shrine',
    name: 'Build a Shrine',
    description: 'Fund and oversee construction of a sacred shrine for the community.',
    minKarma: 1500,
    costFn: (k) => Math.floor(Math.sqrt(k) * 20),
    rewardFn: (k) => Math.floor(Math.sqrt(k) * 100),
    durationSeconds: 300,
  },
  {
    id: 'sacred_pilgrimage',
    name: 'Sacred Pilgrimage',
    description: 'Lead a group of seekers on a journey to a distant holy site.',
    minKarma: 8000,
    costFn: (k) => Math.floor(Math.sqrt(k) * 60),
    rewardFn: (k) => Math.floor(Math.sqrt(k) * 320),
    durationSeconds: 600,
  },
  {
    id: 'guide_lost_souls',
    name: 'Guide Lost Souls',
    description: 'Spend time in deep service, guiding many lifetimes of wandering spirits.',
    minKarma: 40000,
    costFn: (k) => Math.floor(Math.sqrt(k) * 150),
    rewardFn: (k) => Math.floor(Math.sqrt(k) * 900),
    durationSeconds: 1200,
  },
];
