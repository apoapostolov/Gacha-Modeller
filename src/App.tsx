import { useEffect, useMemo, useState } from 'react';
import {
  createState,
  defaultGoal,
  mulberry32,
  pull,
  runMonteCarlo,
  runMonteCarloTwoPickup,
  simulatePoolShare,
  type PullOutcome,
  type SimReport,
} from './engine/index.ts';
import { PRESETS } from './presets/index.ts';
import { Histogram } from './ui/Histogram.tsx';
import { fmt, goalLabel, money } from './ui/format.ts';
import type { Banner, Goal, PoolShareReport, SparkPolicy, Summary } from './engine/index.ts';

const SEED = 20260823;

function rateLine(banner: Banner): { label: string; value: string }[] {
  return banner.rarities
    .filter((rarity) => rarity.baseRate > 0)
    .map((rarity) => ({
      label: rarity.name,
      value: `${(rarity.baseRate * 100).toFixed(rarity.baseRate < 0.02 ? 2 : 1)}%`,
    }));
}

function runTape(banner: Banner, n: number): PullOutcome[] {
  const rng = mulberry32(Date.now() % 1_000_000);
  const state = createState(banner);
  const out: PullOutcome[] = [];
  for (let i = 0; i < n; i++) out.push(pull(banner, state, rng));
  return out;
}

export function App() {
  const [bannerId, setBannerId] = useState(PRESETS[0]!.id);
  const banner = useMemo(
    () => PRESETS.find((entry) => entry.id === bannerId) ?? PRESETS[0]!,
    [bannerId],
  );
  const [trials, setTrials] = useState(8000);
  const [sparkPolicy, setSparkPolicy] = useState<SparkPolicy>('if-needed');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SimReport | null>(null);
  const [share, setShare] = useState<PoolShareReport | null>(null);
  const [heatCompare, setHeatCompare] = useState<SimReport | null>(null);
  const [dual, setDual] = useState<{
    spark: { first: Summary; both: Summary; earlyBoth: Summary };
    charge: { first: Summary; both: Summary; earlyBoth: Summary };
  } | null>(null);
  const [tape, setTape] = useState<PullOutcome[]>([]);

  const goal: Goal = defaultGoal(banner);

  function simulate() {
    setBusy(true);
    window.setTimeout(() => {
      const next = runMonteCarlo(banner, goal, trials, SEED, sparkPolicy);
      setReport(next);
      if (banner.mechanics?.poolSharePlayers) {
        setShare(
          simulatePoolShare(
            banner,
            banner.mechanics.poolSharePlayers,
            90,
            Math.min(trials, 2500),
            SEED,
          ),
        );
      } else {
        setShare(null);
      }
      if (banner.mechanics?.collectionHeat) {
        const cold: Banner = { ...banner, id: `${banner.id}-cold`, mechanics: { collectionHeat: 0 } };
        setHeatCompare(runMonteCarlo(cold, goal, Math.min(trials, 2500), SEED, 'never'));
      } else {
        setHeatCompare(null);
      }
      if (banner.charge || banner.id.startsWith('blue-archive')) {
        const sparkBanner = PRESETS.find((entry) => entry.id === 'blue-archive-spark') ?? banner;
        const chargeBanner = PRESETS.find((entry) => entry.id === 'blue-archive-charge') ?? banner;
        const n = Math.min(trials, 2500);
        setDual({
          spark: runMonteCarloTwoPickup(sparkBanner, n, SEED, 'if-needed'),
          charge: runMonteCarloTwoPickup(chargeBanner, n, SEED, 'never'),
        });
      } else {
        setDual(null);
      }
      setTape(runTape(banner, banner.multiPull?.size ?? 10));
      setBusy(false);
    }, 20);
  }

  useEffect(() => {
    simulate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId, trials, sparkPolicy]);

  const studied = PRESETS.filter((entry) => entry.family === 'studied');
  const original = PRESETS.filter((entry) => entry.family === 'original');

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">Simulation lab</p>
          <h1>Gacha Modeller</h1>
          <p className="lede">
            Run studied pity models and original social or marketing mechanics through Monte Carlo
            trials. Read the cost, the tail, and the player-time before a pool ships.
          </p>
        </div>
        <div className="controls">
          <label>
            Trials
            <input
              type="number"
              min={200}
              max={50000}
              step={500}
              value={trials}
              onChange={(e) => setTrials(Number(e.target.value) || 8000)}
            />
          </label>
          <label>
            Spark
            <select
              value={sparkPolicy}
              onChange={(e) => setSparkPolicy(e.target.value as SparkPolicy)}
            >
              <option value="if-needed">If needed</option>
              <option value="never">Never</option>
            </select>
          </label>
          <button className="primary" onClick={simulate} disabled={busy}>
            {busy ? 'Running…' : 'Run'}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="panel catalog">
          <section className="catalog-group">
            <h2>Studied</h2>
            {studied.map((entry) => (
              <button
                key={entry.id}
                className={entry.id === banner.id ? 'pick active' : 'pick'}
                onClick={() => setBannerId(entry.id)}
              >
                {entry.name}
                <small>{entry.blurb}</small>
              </button>
            ))}
          </section>
          <section className="catalog-group">
            <h2>Original</h2>
            {original.map((entry) => (
              <button
                key={entry.id}
                className={entry.id === banner.id ? 'pick active' : 'pick'}
                onClick={() => setBannerId(entry.id)}
              >
                {entry.name}
                <small>{entry.blurb}</small>
              </button>
            ))}
          </section>
        </aside>

        <section className="panel dossier">
          <h2>Banner</h2>
          <h3>{banner.name}</h3>
          <p className="blurb">{banner.blurb}</p>
          <div className="rates">
            {rateLine(banner).map((row) => (
              <div className="rate" key={row.label}>
                <b>{row.value}</b>
                <span>{row.label}</span>
              </div>
            ))}
            {banner.pity[0] && (
              <div className="rate">
                <b>{banner.pity[0].hardAt}</b>
                <span>Hard pity</span>
              </div>
            )}
            {banner.spark && (
              <div className="rate">
                <b>{banner.spark.cost}</b>
                <span>Spark</span>
              </div>
            )}
            {banner.charge && (
              <>
                <div className="rate">
                  <b>{banner.charge.midAt}</b>
                  <span>{Math.round(banner.charge.midFeaturedChance * 100)}% mid 3-star</span>
                </div>
                <div className="rate">
                  <b>{banner.charge.hardAt}</b>
                  <span>Pickup hard</span>
                </div>
              </>
            )}
            {banner.featured && !banner.charge && (
              <div className="rate">
                <b>{Math.round(banner.featured.chance * 100)}%</b>
                <span>{banner.featured.capturing ? '50/50 capture' : 'Featured share'}</span>
              </div>
            )}
          </div>
          <p className="source">
            <strong>Source. </strong>
            {banner.source}
          </p>
          <ul className="notes">
            {banner.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="tape" aria-label="sample pulls">
            {tape.map((row, i) => (
              <span
                key={`${row.item.id}-${i}`}
                className={row.item.featured ? 'chip featured' : 'chip'}
              >
                {i + 1} {row.item.name}
                {row.pityKind !== 'none' ? ` · ${row.pityKind}` : ''}
              </span>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Results · {goalLabel(goal)}</h2>
          {report && (
            <>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">Mean pulls</div>
                  <div className="value">{fmt(report.pulls.mean)}</div>
                  <div className="sub">
                    median {fmt(report.pulls.median)} · p90 {fmt(report.pulls.p90)}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Mean cost</div>
                  <div className="value">{fmt(report.cost.mean, 0)}</div>
                  <div className="sub">{money(report.cost.p90, banner.pullCost.currency)} at p90</div>
                </div>
                <div className="kpi">
                  <div className="label">Spark rate</div>
                  <div className="value">{fmt(report.sparkRate * 100, 1)}%</div>
                  <div className="sub">{report.trials.toLocaleString()} trials · seed {report.seed}</div>
                </div>
                <div className="kpi">
                  <div className="label">
                    {goal.type === 'collection' ? 'Unique items' : 'Featured copies'}
                  </div>
                  <div className="value">
                    {fmt(goal.type === 'collection' ? report.uniqueCount.mean : report.featuredCount.mean)}
                  </div>
                  <div className="sub">
                    max {fmt(goal.type === 'collection' ? report.uniqueCount.max : report.featuredCount.max, 0)}
                  </div>
                </div>
              </div>
              <Histogram data={report.histogram} unit="pulls" />
            </>
          )}
          {share && (
            <p className="compare">
              <strong>Pool share vs solo.</strong> {share.players} players × {share.budgetPerPlayer}{' '}
              pulls. Shared mean featured {fmt(share.sharedFeatured.mean, 2)} vs solo{' '}
              {fmt(share.soloFeatured.mean, 2)}. Solo leftover pity wasted:{' '}
              {fmt(share.leftoverPityWasteSolo.mean, 1)} pulls.
            </p>
          )}
          {heatCompare && report && (
            <p className="compare">
              <strong>Heat vs cold album.</strong> Mean packs to complete {fmt(report.pulls.mean)} with
              heat, {fmt(heatCompare.pulls.mean)} without. Heat cuts duplicates; it does not create
              new stickers.
            </p>
          )}
          {dual && (
            <p className="compare">
              <strong>Two sequential pickups.</strong> If A lands by pull 80, Spark still finishes both by
              200 (p90 {fmt(dual.spark.earlyBoth.p90)}, max {fmt(dual.spark.earlyBoth.max, 0)}). Charge
              zeros the bar, so B is a new cycle (p90 {fmt(dual.charge.earlyBoth.p90)}, max{' '}
              {fmt(dual.charge.earlyBoth.max, 0)}). Unconditional mean can still favor Charge. The 100
              coin is a gift. The lost leftover is the nerf.
            </p>
          )}
        </section>
      </div>

      <p className="foot">
        Local Vite app. Engine is deterministic from a seed. Methodology lives in{' '}
        <a href="https://github.com/apoapostolov/Gacha-Modeller/blob/main/docs/methodology.md">
          docs/methodology.md
        </a>
        . Presets are like-models, not licensed live tables.
      </p>
    </div>
  );
}
