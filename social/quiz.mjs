const CAREER_FAME = 55;
const BRIDGE_FAME = 40;
const HIGHER_FAME = 60;
const HOME_CLUBS = ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor'];
const MAX_PATH = 8;

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

export function createQuizzes(football, texts, used, random = Math.random) {
  const templates = texts.quiz;

  function career() {
    const candidates = football.players.filter((player) => player.fame_tr >= CAREER_FAME && !used.has(`career:${player.id}`));
    for (let attempt = 0; attempt < 50 && candidates.length > 0; attempt += 1) {
      const player = pick(candidates, random);
      const steps = football.career(player.id);
      if (steps.length < 4 || steps.length > MAX_PATH) continue;
      const path = steps.map((step) => `${step.from} ${step.club}`).join('\n');
      return {
        key: `career:${player.id}`,
        kind: 'career',
        text: fill(templates.career, { path }),
        answer: fill(templates.careerAnswer, { name: player.name, path }) + templates.answerTail,
      };
    }
    return null;
  }

  function bridge() {
    const homes = HOME_CLUBS.map((name) => football.find(name).find((entity) => entity.kind === 'club')).filter(Boolean);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const home = pick(homes, random);
      const famous = football.famousPlayersOf(home.id).filter((player) => player.fame_tr >= BRIDGE_FAME);
      const counts = new Map();
      for (const player of famous) {
        for (const club of football.clubsOf(player.id)) {
          if (club !== home.id && football.isCoreClub(club) && football.clubLeague.get(club) !== 'TR1') {
            counts.set(club, [...(counts.get(club) ?? []), player]);
          }
        }
      }
      const options = [...counts].filter(([club, players]) => players.length >= 4 && !used.has(`bridge:${home.id}:${club}`));
      if (options.length === 0) continue;
      const [club, players] = pick(options, random);
      const first = football.displayClub(home.id);
      const second = football.displayClub(club);
      const shown = players.slice(0, 6).map((player) => player.name).join(', ');
      const rest = players.length - 6;
      return {
        key: `bridge:${home.id}:${club}`,
        kind: 'bridge',
        text: fill(templates.bridge, { first, second, count: players.length }),
        answer: fill(templates.bridgeAnswer, { first, second, names: shown }) + (rest > 0 ? fill(templates.bridgeMore, { count: rest }) : '') + templates.answerTail,
      };
    }
    return null;
  }

  function higher() {
    const scorers = football.players
      .filter((player) => player.fame_tr >= HIGHER_FAME && player.position === 'FW')
      .map((player) => ({ player, stats: football.statsStatement.get(player.id) }))
      .filter(({ stats }) => stats?.is_complete && stats.goals >= 50);
    for (let attempt = 0; attempt < 100 && scorers.length > 1; attempt += 1) {
      const first = pick(scorers, random);
      const second = pick(scorers, random);
      if (first === second) continue;
      const key = `higher:${Math.min(first.player.id, second.player.id)}:${Math.max(first.player.id, second.player.id)}`;
      const gap = Math.abs(first.stats.goals - second.stats.goals) / Math.max(first.stats.goals, second.stats.goals);
      if (used.has(key) || gap < 0.08 || gap > 0.5) continue;
      const [winner, loser] = first.stats.goals > second.stats.goals ? [first, second] : [second, first];
      return {
        key,
        kind: 'higher',
        text: fill(templates.higher, { first: first.player.name, second: second.player.name }),
        answer:
          fill(templates.higherAnswer, {
            winner: winner.player.name,
            winnerGoals: winner.stats.goals,
            loser: loser.player.name,
            loserGoals: loser.stats.goals,
          }) + templates.answerTail,
      };
    }
    return null;
  }

  return { career, bridge, higher };
}

export function dailySet(makers, dayNumber) {
  const second = dayNumber % 2 === 0 ? makers.bridge : makers.higher;
  return [makers.career(), second()].filter(Boolean);
}
