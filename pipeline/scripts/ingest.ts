/**
 * ENCORE — World Cup archive ingest.
 * Enumerates all World Cup fixtures, then harvests full historical odds + scores
 * for every finished match via the 5-minute interval endpoints.
 *
 * Usage: NETWORK=devnet npx ts-node scripts/ingest.ts
 * Output: data/archive/fixtures.json + data/archive/<fixtureId>/{odds,scores}.json
 */
import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as path from "path";

const NETWORK = process.env.NETWORK || "devnet";
const WORLD_CUP_COMPETITION_ID = 72;
const CONCURRENCY = 8;
// Harvest window around each match: 15 min before kickoff -> 3h30 after
// (covers ET + penalties; intervals returning [] are cheap).
const PRE_MS = 15 * 60 * 1000;
const POST_MS = 210 * 60 * 1000;

const creds = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", `credentials.${NETWORK}.json`), "utf8")
);
const ARCHIVE = path.join(__dirname, "..", "data", "archive");
fs.mkdirSync(ARCHIVE, { recursive: true });

let jwt: string = creds.jwt;

const api: AxiosInstance = axios.create({ baseURL: `${creds.apiOrigin}/api`, timeout: 30000 });
api.interceptors.request.use((cfg) => {
  cfg.headers["Authorization"] = `Bearer ${jwt}`;
  cfg.headers["X-Api-Token"] = creds.apiToken;
  return cfg;
});
api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    jwt = (await axios.post(`${creds.apiOrigin}/auth/guest/start`)).data.token;
    return api(original);
  }
  throw error;
});

async function getWithRetry(url: string, attempts = 4): Promise<any[]> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e: any) {
      if (i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return [];
}

type Interval = { epochDay: number; hour: number; interval: number };

function intervalsBetween(startMs: number, endMs: number): Interval[] {
  const out: Interval[] = [];
  for (let t = Math.floor(startMs / 300000) * 300000; t <= endMs; t += 300000) {
    const sec = Math.floor(t / 1000);
    out.push({
      epochDay: Math.floor(sec / 86400),
      hour: Math.floor((sec % 86400) / 3600),
      interval: Math.floor((sec % 3600) / 300),
    });
  }
  return out;
}

async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function harvestFixture(fx: any): Promise<void> {
  const dir = path.join(ARCHIVE, String(fx.FixtureId));
  const oddsPath = path.join(dir, "odds.json");
  const scoresPath = path.join(dir, "scores.json");
  if (fs.existsSync(oddsPath) && fs.existsSync(scoresPath)) {
    console.log(`  ${fx.FixtureId} ${fx.Participant1} v ${fx.Participant2}: cached, skip`);
    return;
  }
  fs.mkdirSync(dir, { recursive: true });

  const ivs = intervalsBetween(fx.StartTime - PRE_MS, fx.StartTime + POST_MS);
  const odds: any[] = [];
  const scores: any[] = [];

  await pooled(ivs, CONCURRENCY, async (iv) => {
    const base = `${iv.epochDay}/${iv.hour}/${iv.interval}?fixtureId=${fx.FixtureId}`;
    const [o, s] = await Promise.all([
      getWithRetry(`/odds/updates/${base}`),
      getWithRetry(`/scores/updates/${base}`),
    ]);
    odds.push(...o);
    scores.push(...s);
  });

  odds.sort((a, b) => a.Ts - b.Ts);
  scores.sort((a, b) => a.Ts - b.Ts || (a.Seq ?? 0) - (b.Seq ?? 0));
  fs.writeFileSync(oddsPath, JSON.stringify(odds));
  fs.writeFileSync(scoresPath, JSON.stringify(scores));
  console.log(
    `  ${fx.FixtureId} ${fx.Participant1} v ${fx.Participant2}: ${odds.length} odds, ${scores.length} score updates`
  );
}

async function main() {
  // World Cup 2026: June 11 - July 19. Snapshot window is 30 days, so walk two anchors.
  const anchors = [20612, 20642]; // Jun 8, Jul 8 2026
  const byId = new Map<number, any>();
  for (const day of anchors) {
    const fixtures = await getWithRetry(
      `/fixtures/snapshot?competitionId=${WORLD_CUP_COMPETITION_ID}&startEpochDay=${day}`
    );
    for (const f of fixtures) byId.set(f.FixtureId, f);
  }
  const all = [...byId.values()].sort((a, b) => a.StartTime - b.StartTime);
  fs.writeFileSync(path.join(ARCHIVE, "fixtures.json"), JSON.stringify(all, null, 2));
  console.log(`fixtures total: ${all.length}`);

  const now = Date.now();
  const finished = all.filter((f) => f.StartTime + POST_MS < now);
  console.log(`finished matches to harvest: ${finished.length}`);

  for (const fx of finished) {
    await harvestFixture(fx);
  }
  console.log("ingest complete");
}

main().then(
  () => process.exit(0),
  (err) => {
    if (axios.isAxiosError(err)) console.error("HTTP error:", err.response?.status, err.config?.url, JSON.stringify(err.response?.data).slice(0, 300));
    else console.error(err);
    process.exit(1);
  }
);
