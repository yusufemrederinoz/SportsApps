const APP_ID = 6820528682;
const TERMS = {
  tr: [
    'challengegoal',
    'futbol düellosu',
    'futbol düello',
    'futbol xox',
    'futbol trivia',
    'futbol bilgi',
    'futbolcu tahmin',
    'futbol quiz',
    'futbol bilgi yarışması',
    'futbol bilgi oyunu',
    'futbol bulmaca',
    'futbol soruları',
  ],
  gb: ['football trivia', 'football quiz', 'football grid'],
  us: ['soccer trivia', 'soccer quiz', 'football quiz', 'football trivia'],
  de: ['fußball quiz', 'fussball quiz'],
  es: ['quiz de fútbol', 'trivia fútbol'],
  fr: ['quiz foot', 'quiz football'],
  it: ['quiz calcio', 'quiz di calcio'],
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function search(country, term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=200`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      return (await response.json()).results;
    }
    await sleep(3000);
  }
  return null;
}

for (const [country, terms] of Object.entries(TERMS)) {
  for (const term of terms) {
    const results = await search(country, term);
    if (!results) {
      console.log(`${country}\t${term}\trequest failed`);
      continue;
    }
    const index = results.findIndex((app) => app.trackId === APP_ID);
    console.log(`${country}\t${term}\t${index === -1 ? `-/${results.length}` : index + 1}`);
    await sleep(1200);
  }
}
