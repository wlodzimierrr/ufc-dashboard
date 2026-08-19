import { readFile, stat } from 'fs/promises';
import path from 'path';
import { BettingBet, BettingDashboardData, BettingSummary } from '@/lib/types';

const UFC_DATA_ROOT = process.env.UFC_DATA_ROOT || path.resolve(process.cwd(), '..', 'ufc-data');
const REPORT_ROOT = path.join(UFC_DATA_ROOT, 'data', 'reports');

const SUMMARY_REPORTS = [
  {
    label: 'Default Policy',
    source: 'honest' as const,
    summaryPath: path.join(REPORT_ROOT, 'betting_default', 'betting_backtest_summary.csv'),
    fightsPath: path.join(REPORT_ROOT, 'betting_default', 'betting_backtest_fights.csv'),
  },
  {
    label: 'Conservative Candidate',
    source: 'honest' as const,
    summaryPath: path.join(REPORT_ROOT, 'betting_conservative_candidate', 'betting_backtest_summary.csv'),
    fightsPath: path.join(REPORT_ROOT, 'betting_conservative_candidate', 'betting_backtest_fights.csv'),
  },
  {
    label: 'Kaggle Research',
    source: 'research' as const,
    summaryPath: path.join(REPORT_ROOT, 'kaggle_research_backtest_summary.csv'),
    fightsPath: path.join(REPORT_ROOT, 'kaggle_research_backtest_fights.csv'),
  },
];

export async function getBettingDashboardData(): Promise<BettingDashboardData> {
  const summaries = await Promise.all(
    SUMMARY_REPORTS.map(async (report) => {
      const rows = await readCsv(report.summaryPath);
      const overall = rows.find((row) => row.summary_type === 'overall' && row.group === 'all');
      if (!overall) return null;
      return toBettingSummary(report.label, report.source, report.summaryPath, overall);
    })
  );
  const bets = await Promise.all(
    SUMMARY_REPORTS.map(async (report) => {
      const rows = await readCsv(report.fightsPath);
      return [
        report.label,
        rows
          .filter((row) => row.decision === 'bet')
          .map(toBettingBet)
          .filter((row): row is BettingBet => row !== null),
      ] as const;
    })
  );

  const mtimes = await Promise.all(
    SUMMARY_REPORTS.flatMap((report) => [report.summaryPath, report.fightsPath]).map(fileMtime)
  );
  const updatedAt = mtimes
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) || null;

  return {
    summaries: summaries.filter((summary): summary is BettingSummary => summary !== null),
    betsBySummary: Object.fromEntries(bets),
    updatedAt,
  };
}

async function readCsv(filePath: string): Promise<Record<string, string>[]> {
  try {
    const text = await readFile(filePath, 'utf8');
    return parseCsv(text);
  } catch {
    return [];
  }
}

async function fileMtime(filePath: string): Promise<string | null> {
  try {
    const info = await stat(filePath);
    return info.mtime.toISOString();
  } catch {
    return null;
  }
}

function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  const header = rows[0];
  if (!header) return [];
  return rows.slice(1).map((row) => {
    const output: Record<string, string> = {};
    header.forEach((key, index) => {
      output[key] = row[index] || '';
    });
    return output;
  });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function toBettingSummary(
  label: string,
  source: BettingSummary['source'],
  reportPath: string,
  row: Record<string, string>
): BettingSummary {
  return {
    label,
    source,
    reportPath,
    total_bets: parseIntValue(row.total_bets),
    wins: parseIntValue(row.wins),
    losses: parseIntValue(row.losses),
    pushes: parseIntValue(row.pushes),
    total_staked: parseNumberValue(row.total_staked),
    profit_loss: parseNumberValue(row.profit_loss),
    roi: parseNullableNumber(row.roi),
    hit_rate: parseNullableNumber(row.hit_rate),
    average_odds: parseNullableNumber(row.average_odds),
    max_drawdown: parseNumberValue(row.max_drawdown),
    starting_bankroll: parseNumberValue(row.starting_bankroll),
    ending_bankroll: parseNumberValue(row.ending_bankroll),
    odds_policy: row.odds_policy || '',
    max_one_bet_per_fight: row.max_one_bet_per_fight === 'true',
    kelly_fraction: parseNumberValue(row.kelly_fraction),
    min_edge: parseNumberValue(row.min_edge),
    min_ev: parseNumberValue(row.min_ev),
  };
}

function toBettingBet(row: Record<string, string>): BettingBet | null {
  if (!row.event_date || !row.event_name || !row.fight_id) return null;
  return {
    event_name: row.event_name,
    event_date: row.event_date,
    fight_id: row.fight_id,
    fighter_name: row.recommended_fighter_name || row.fighter_name,
    opponent_fighter_name: row.opponent_fighter_name,
    bookmaker: row.bookmaker,
    line_type: row.line_type,
    odds_timestamp: row.odds_timestamp,
    model_probability: parseNumberValue(row.model_probability),
    no_vig_market_probability: parseNumberValue(row.no_vig_market_probability),
    edge: parseNumberValue(row.edge),
    ev_per_unit: parseNumberValue(row.ev_per_unit),
    offered_decimal_odds: parseNumberValue(row.offered_decimal_odds),
    confidence_tier: row.confidence_tier,
    stake_amount: parseNumberValue(row.stake_amount),
    bet_result: row.bet_result,
    profit_loss_amount: parseNumberValue(row.profit_loss_amount),
    actual_winner_name: row.actual_winner_name,
    resolved: row.resolved === 'true',
  };
}

function parseIntValue(value: string | undefined): number {
  return Number.parseInt(value || '0', 10) || 0;
}

function parseNumberValue(value: string | undefined): number {
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
