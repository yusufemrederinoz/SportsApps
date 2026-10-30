export const REACTION_IDS = [
  'laugh',
  'tease',
  'cool',
  'shock',
  'sweat',
  'cry',
  'angry',
  'clap',
  'red-card',
  'var',
  'offside',
  'save',
] as const;

export type ReactionId = (typeof REACTION_IDS)[number];

export const REACTION_COOLDOWN_MILLISECONDS = 2500;
export const REACTIONS_PER_MATCH = 20;

export function isReactionId(value: unknown): value is ReactionId {
  return (REACTION_IDS as readonly unknown[]).includes(value);
}
