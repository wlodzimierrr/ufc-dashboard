const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const requireFromApp = createRequire(path.join(root, 'package.json'));
const ts = requireFromApp('typescript');
const React = requireFromApp('react');
const { renderToStaticMarkup } = requireFromApp('react-dom/server');
const NOW = new Date('2026-11-04T14:00:00.000Z');

// Compile the actual TypeScript/TSX using installed dependencies. A database
// module can only be reached through an explicit synthetic stub in these tests.
function load(relative, stubs = {}, exposeContent = false) {
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(stubs, name)) return stubs[name];
    if (name === '@/lib/db/client' || name === 'pg') throw new Error('Real database access is forbidden in this test');
    if (name.startsWith('@/')) {
      const base = name.slice(2);
      const target = ['.ts', '.tsx'].map((extension) => base + extension)
        .find((candidate) => fs.existsSync(path.join(root, candidate)));
      assert.ok(target, `Unknown local import: ${name}`);
      return load(target, stubs);
    }
    return requireFromApp(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled.outputText}
    ${exposeContent ? 'exports.__BettingContent = BettingContent;' : ''}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

function row(overrides = {}) {
  return {
    fight_id: 'fight-1', event_id: 'event-1', event_name: 'UFC Synthetic Card', event_date: '2026-11-07',
    fighter_1_id: 'fighter-1', fighter_2_id: 'fighter-2',
    fighter_1_name: 'Alpha Fighter', fighter_2_name: 'Beta Fighter',
    calibrated_prob_f1_full: 0.72, decision_status: 'pick', is_actionable: true,
    pick_label: 1, pick_winner_name: 'Alpha Fighter', uncertainty_reasons: [],
    decision_policy_version: 'probability_band_v1', decision_origin: 'recorded_at_scoring',
    confidence_tier: 'high', model_name: 'production-xgb', scored_at: '2026-11-04T12:00:00Z',
    ...overrides,
  };
}

function quote(overrides = {}) {
  return {
    market_report_key: 'current_bfo_mean', market_source: 'honest',
    market_detail_mode: 'current_recommendations', market_kind: 'moneyline', market_line_type: 'current',
    market_fight_id: 'fight-1', market_event_id: 'event-1', market_fighter_id: 'fighter-2',
    market_opponent_fighter_id: 'fighter-1', market_bookmaker: 'BFO Mean',
    market_model_probability: 0.28, market_probability: '0.22', market_decimal_odds: '4.60',
    market_edge: '0.06', market_ev_per_unit: '0.288', market_decision: 'bet',
    market_recommended_fighter_id: 'fighter-2', market_stake_amount: '12.5',
    market_odds_timestamp: '2026-11-04T13:00:00Z', market_report_generated_at: '2026-11-04T13:30:00Z',
    // Existing report loader leaves this null; it is deliberately not a join key.
    market_scored_at: null,
    ...overrides,
  };
}

const reports = load('lib/bettingReports.ts');
const { BettingSection } = load('components/BettingSection.tsx');
const data = (predictions, error = false) => ({ predictions, updatedAt: predictions[0]?.scoredAt || null, error });
const render = (value) => renderToStaticMarkup(React.createElement(BettingSection, { data: value }));
const visible = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('query starts from current prediction decisions and keeps native upcoming fights with optional comparisons', async () => {
  const calls = [];
  const db = { query: async (...arguments) => { calls.push(arguments); return [row(), row({ fight_id: 'fight-2' })]; } };
  const actual = load('lib/bettingReports.ts', { '@/lib/db/client': db });
  const result = await actual.getBettingDashboardData(NOW);
  assert.equal(calls.length, 1);
  assert.equal(result.predictions.length, 2, 'No report rows are required for forecast coverage');
  assert.equal(result.predictions[0].market, null);
  const sql = calls[0][0].replace(/\s+/g, ' ');
  assert.match(sql, /FROM current_event_prediction_decisions p JOIN fights f/);
  assert.match(sql, /JOIN events e ON e.event_id = f.event_id/);
  assert.match(sql, /f.fighter_1_id = p.fighter_1_id AND f.fighter_2_id = p.fighter_2_id/);
  assert.match(sql, /LEFT JOIN LATERAL/);
  assert.match(sql, /e.event_status = 'upcoming' AND e.event_date >= CURRENT_DATE/);
  assert.match(sql, /f.result_type = 'upcoming'/);
  assert.match(sql, /r.report_key = 'current_bfo_mean' AND r.source = 'honest'/);
  assert.match(sql, /r.detail_mode = 'current_recommendations'/);
  assert.match(sql, /r.market = 'moneyline' AND r.line_type = 'current'/);
  assert.match(sql, /r.resolved = false/);
  assert.match(sql, /r.fight_id = f.fight_id::text AND r.event_id = e.event_id::text/);
  assert.match(sql, /r.fighter_id = f.fighter_1_id::text AND r.opponent_fighter_id = f.fighter_2_id::text/);
  assert.match(sql, /r.fighter_id = f.fighter_2_id::text AND r.opponent_fighter_id = f.fighter_1_id::text/);
  assert.match(sql, /r.report_generated_at >= p.scored_at/);
  assert.match(sql, /r.odds_timestamp <= CURRENT_TIMESTAMP/);
  assert.match(sql, /r.odds_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'/);
  assert.match(sql, /ABS\(r.model_probability::double precision - CASE.*p.calibrated_prob_f1_full.*1.0 - p.calibrated_prob_f1_full END\) <= 1e-8/);
  assert.match(sql, /ORDER BY CASE WHEN r.decision = 'bet' THEN 0 ELSE 1 END, r.stake_amount DESC, r.odds_timestamp DESC, r.row_number ASC LIMIT 1/);
  assert.doesNotMatch(sql, /r.scored_at|betting_report_summaries|default_policy|conservative_candidate|kaggle_research/);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i);
  assert.doesNotMatch(sql, /actual_winner|profit_loss|bankroll|bet_result|predicted_winner_name|\b[pr]\.\*/i);
});

for (const [probability, expectedId] of [
  [0, 'fighter-2'], [0.39999999999999997, 'fighter-2'], [0.4, null],
  [0.4000000000000001, null], [0.5, null], [0.5999999999999999, null],
  [0.6, null], [0.6000000000000001, 'fighter-1'], [1, 'fighter-1'],
]) {
  test(`full probability ${probability} preserves inclusive NO PICK boundaries`, () => {
    const label = probability < 0.4 ? 0 : 1;
    const prediction = reports.toBettingPrediction(row({ calibrated_prob_f1_full: String(probability),
      pick_label: label, pick_winner_name: label === 1 ? 'Alpha Fighter' : 'Beta Fighter' }), NOW);
    assert.equal(prediction.modelPick?.fighterId || null, expectedId);
    assert.equal(prediction.isActionable, expectedId !== null);
    assert.equal(prediction.fighter1.probability, probability);
    assert.equal(prediction.fighter2.probability, 1 - probability);
  });
}

for (const invalid of [null, undefined, '', ' ', 'NaN', 'Infinity', '0.7invalid', -0.01, 1.01]) {
  test(`invalid full probability ${String(invalid)} cannot become a fabricated forecast`, () => {
    assert.equal(reports.toBettingPrediction(row({ calibrated_prob_f1_full: invalid }), NOW), null);
  });
}

test('decision disagreement and latent winner cannot create a model pick', () => {
  for (const conflict of [{ decision_status: 'no_pick' }, { is_actionable: false },
    { pick_label: null }, { pick_winner_name: null }, { pick_label: 0 }]) {
    const prediction = reports.toBettingPrediction(row({ predicted_winner_name: 'LATENT_WINNER', ...conflict }), NOW);
    assert.equal(prediction.modelPick, null);
    assert.equal(prediction.isActionable, false);
    assert.ok(!JSON.stringify(prediction).includes('LATENT_WINNER'));
  }
});

test('valid opposite-side market quote stays separate from the model pick', () => {
  const prediction = reports.toBettingPrediction(row(quote()), NOW);
  assert.equal(prediction.modelPick.name, 'Alpha Fighter');
  assert.equal(prediction.market.evaluatedFighterName, 'Beta Fighter');
  assert.equal(prediction.market.modelProbability, 0.28);
  assert.equal(prediction.market.suggestedStake, 12.5);
  const text = visible(render(data([prediction])));
  assert.match(text, /Model pick: Alpha Fighter/);
  assert.match(text, /Market comparison: Beta Fighter/);
  assert.match(text, /72\.00%.*28\.00%/);
  assert.match(text, /aggregate benchmark/);
  assert.match(text, /Benchmark signal/);
  assert.match(text, /Illustrative stake 12\.5 units/);
  assert.doesNotMatch(text, /Suggested bet|Suggested stake|[$£€]/);
});

test('named-book suggestions use suggested stakes without implying they were placed', () => {
  const prediction = reports.toBettingPrediction(row(quote({ market_bookmaker: 'Synthetic Sportsbook' })), NOW);
  const text = visible(render(data([prediction])));
  assert.match(text, /Suggested bet/);
  assert.match(text, /Suggested stake 12\.5 units/);
  assert.match(text, /Suggestions are not placed bets/);
  assert.doesNotMatch(text, /aggregate benchmark|Illustrative stake|[$£€]/);
});

for (const [name, change] of Object.entries({
  oldOdds: { market_odds_timestamp: '2026-11-02T13:59:59Z' },
  futureOdds: { market_odds_timestamp: '2026-11-04T14:00:01Z' },
  staleReport: { market_report_generated_at: '2026-11-04T11:59:59Z' },
  futureReport: { market_report_generated_at: '2026-11-04T14:00:01Z' },
  differentModelProbability: { market_model_probability: 0.281 },
  wrongEvaluatedSide: { market_model_probability: 0.72 },
  differentFight: { market_fight_id: 'other-fight' }, differentEvent: { market_event_id: 'other-event' },
  otherFighter: { market_fighter_id: 'other-fighter' }, otherOpponent: { market_opponent_fighter_id: 'other-fighter' },
  historicalReport: { market_report_key: 'default_policy' }, research: { market_source: 'research' },
  historicalMode: { market_detail_mode: 'backtest' }, wrongMarket: { market_kind: 'rounds' },
  openingLine: { market_line_type: 'opening' }, missingOdds: { market_decimal_odds: null },
  invalidPrice: { market_decimal_odds: 1 }, missingTimestamp: { market_odds_timestamp: null },
  missingMarketProbability: { market_probability: null }, invalidMarketProbability: { market_probability: 0 },
  invalidEdge: { market_edge: 'not-a-number' }, invalidEv: { market_ev_per_unit: 'Infinity' },
})) {
  test(`unusable optional comparison (${name}) keeps the forecast`, () => {
    const prediction = reports.toBettingPrediction(row(quote(change)), NOW);
    assert.equal(prediction.modelPick.name, 'Alpha Fighter');
    assert.equal(prediction.market, null);
    assert.match(visible(render(data([prediction]))), /No fresh matching market comparison/);
  });
}

test('48-hour freshness and probability tolerance retain eligible boundary quotes', () => {
  for (const changes of [
    { market_odds_timestamp: '2026-11-02T14:00:00Z' },
    { market_odds_timestamp: '2026-11-04T14:00:00Z' },
    { market_model_probability: 0.280000005 },
    { market_report_generated_at: '2026-11-04T12:00:00Z' },
  ]) assert.ok(reports.toBettingPrediction(row(quote(changes)), NOW).market);
});

test('NO PICK cannot serialize or display an actionable quote or positive stake', () => {
  const prediction = reports.toBettingPrediction(row({ ...quote({ market_model_probability: 0.5, market_stake_amount: 9876.54 }),
    calibrated_prob_f1_full: 0.5 }), NOW);
  assert.equal(prediction.modelPick, null);
  assert.equal(prediction.market.decision, 'pass');
  assert.equal(prediction.market.suggestedStake, 0);
  // Also verify the UI guard when an inconsistent caller bypasses the mapper.
  const unsafe = { ...prediction, decisionStatus: 'pick', isActionable: true,
    modelPick: { fighterId: 'fighter-1', name: 'Alpha Fighter' },
    market: { ...prediction.market, decision: 'bet', suggestedStake: 9876.54 } };
  for (const value of [prediction, unsafe]) {
    const text = visible(render(data([value])));
    assert.match(text, /Model pick: NO PICK/);
    assert.match(text, /Pass/);
    assert.match(text, /Illustrative stake 0 units/);
    assert.doesNotMatch(text, /9,876|9876|Benchmark signal|Suggested bet/);
  }
});

test('pass or mismatched recommendation identity never carries a positive suggested stake', () => {
  for (const changes of [{ market_decision: 'pass' }, { market_recommended_fighter_id: 'fighter-1' },
    { market_stake_amount: -1 }, { market_stake_amount: null }, { market_stake_amount: 'Infinity' }]) {
    const prediction = reports.toBettingPrediction(row(quote(changes)), NOW);
    assert.equal(prediction.market.decision, 'pass');
    assert.equal(prediction.market.suggestedStake, 0);
  }
});

test('mapper and rendered cards discard seeded outcomes, summaries, histories and latent winners', async () => {
  const forbidden = ['SECRET_ACTUAL_WINNER', 'SECRET_RESULT', 'SECRET_PROFIT', 'SECRET_BANKROLL',
    'SECRET_RESEARCH', 'SECRET_LATENT_WINNER'];
  const seeded = row({ ...quote(), actual_winner_name: forbidden[0], bet_result: forbidden[1],
    profit_loss_amount: forbidden[2], bankroll_after_event: forbidden[3],
    summary_label: forbidden[4], predicted_winner_name: forbidden[5],
    roi: 'SECRET_ROI', actual_label: 'SECRET_ACTUAL_LABEL' });
  const actual = load('lib/bettingReports.ts', { '@/lib/db/client': { query: async () => [seeded] } });
  const result = await actual.getBettingDashboardData(NOW);
  const serialized = JSON.stringify(result);
  const html = render({ ...result, summaries: [{ label: forbidden[4], profit_loss: forbidden[2] }],
    betsBySummary: { history: [seeded] } });
  for (const marker of [...forbidden, 'SECRET_ROI', 'SECRET_ACTUAL_LABEL']) {
    assert.ok(!serialized.includes(marker), marker);
    assert.ok(!html.includes(marker), marker);
  }
  assert.doesNotMatch(visible(html), /\b(?:ROI|P\/L|bankroll|backtests?|history|settled|profit|loss)\b/i);
  assert.doesNotMatch(html, /role="dialog"/);
  assert.deepEqual(Object.keys(result).sort(), ['error', 'predictions', 'updatedAt']);
});

test('forecasts group by event instead of turning comparison coverage into the card count', () => {
  const predictions = [row(), row({ fight_id: 'fight-2' }),
    row({ fight_id: 'fight-3', event_id: 'event-2', event_name: 'Another Card' })]
    .map((value) => reports.toBettingPrediction(value, NOW));
  const html = render(data(predictions));
  assert.equal((html.match(/<article/g) || []).length, 3);
  assert.equal((html.match(/<section/g) || []).length, 2);
  assert.equal((visible(html).match(/UFC Synthetic Card/g) || []).length, 1);
});

test('empty and database-error states are distinct and never leak raw errors', async () => {
  const empty = load('lib/bettingReports.ts', { '@/lib/db/client': { query: async () => [] } });
  const emptyData = await empty.getBettingDashboardData(NOW);
  assert.deepEqual(emptyData, { predictions: [], updatedAt: null, error: false });
  assert.match(visible(render(emptyData)), /No upcoming predictions yet/);
  const failed = load('lib/bettingReports.ts', { '@/lib/db/client': { query: async () => {
    throw new Error('postgres://private:SECRET_PASSWORD@internal-db');
  } } });
  const errorData = await failed.getBettingDashboardData(NOW);
  assert.deepEqual(errorData, { predictions: [], updatedAt: null, error: true });
  const html = render(errorData);
  assert.match(html, /role="alert"/);
  assert.match(visible(html), /Predictions are temporarily unavailable/);
  assert.doesNotMatch(html + JSON.stringify(errorData), /SECRET_PASSWORD|internal-db|postgres:/);
  // No stub: importing the database module fails, which must also remain safe.
  assert.deepEqual(await reports.getBettingDashboardData(NOW), errorData);
});

test('the page header describes upcoming forecasts for populated, empty and error states', async () => {
  for (const value of [data([reports.toBettingPrediction(row(), NOW)]), data([]), data([], true)]) {
    const page = load('app/betting/page.tsx', {
      '@/lib/bettingReports': { getBettingDashboardData: async () => value },
    }, true);
    const html = renderToStaticMarkup(await page.__BettingContent());
    assert.match(visible(html), /Betting predictions/);
    assert.match(visible(html), /Model forecasts for upcoming fights/);
    assert.doesNotMatch(visible(html), /\b(?:ROI|P\/L|bankroll|backtests?|history|settled)\b/i);
  }
});
