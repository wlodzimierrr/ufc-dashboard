# UFC Fight Prediction Dashboard
### Website: [UFC_DASHBOARD](https://ufc.wlodzimierrr.pl)
A production-ready Next.js dashboard for displaying UFC fight predictions, model accuracy analytics, and live prediction updates from your ML platform.

## Features

- **Dashboard Overview**: Real-time accuracy statistics, upcoming predictions count, and model version tracking
- **Upcoming Predictions**: Browse next UFC event predictions with confidence tiers and probabilities
- **Past Events**: Review historical event accuracy and fight-level predictions
- **Analytics**: Deep dive into model performance, confidence tier breakdown, model version comparison, and calibration analysis
- **Dark Sports Analytics Theme**: Modern red-accented UI inspired by professional sports analytics platforms
- **Responsive Design**: Fully responsive layout for desktop and mobile
- **Real-time Data**: All data sourced directly from PostgreSQL database

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: PostgreSQL with `pg` driver
- **UI Components**: Custom built components with semantic HTML

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database with UFC predictions data

### Installation

1. **Clone or open the project**

```bash
cd ufc-dashboard
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure database connection**

Create `.env.local` in the project root (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Update `.env.local` with your PostgreSQL connection string:

```
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for production**

```bash
npm run build
npm start
```

## Database Schema Mapping

The dashboard expects a PostgreSQL database with the following logical entities. The adapter layer in [`lib/db/dashboardQueries.ts`](lib/db/dashboardQueries.ts) allows you to map your exact table and column names.

### Expected Tables and Columns

#### `predictions` table

Core table for fight predictions:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string/uuid | Unique prediction ID |
| `event_id` | string/uuid | Reference to event |
| `event_name` | string | UFC event name |
| `event_date` | timestamp | Event date/time |
| `fight_id` | string | UFC fight identifier |
| `fighter_a` | string | First fighter name |
| `fighter_b` | string | Second fighter name |
| `predicted_winner` | string | Model's predicted winner |
| `predicted_winner_probability` | numeric (0-1) | Win probability for predicted winner |
| `fighter_a_win_probability` | numeric (0-1) | Alternative: Fighter A win probability |
| `fighter_b_win_probability` | numeric (0-1) | Alternative: Fighter B win probability |
| `confidence_tier` | string | 'High', 'Medium', 'Low', 'Uncertain' (optional - can be derived) |
| `uncertainty_flag` | boolean | Flag for uncertain predictions |
| `model_version` | string | Model version that made prediction |
| `prediction_generated_at` | timestamp | When prediction was generated |
| `actual_winner` | string | Actual fight winner (null until completed) |
| `result_method` | string | KO/TKO, Submission, Decision, etc. (optional) |
| `result_round` | integer | Round number fight ended (optional) |
| `is_correct` | boolean | Whether prediction was correct (optional - can be derived) |
| `completed` | boolean | Whether fight is complete |

#### `events` table

Event metadata:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string/uuid | Unique event ID |
| `name` | string | Event name |
| `event_date` | timestamp | Event date |
| `location` | string | Event location |
| `completed` | boolean | Whether event is finished |

### Customizing SQL Queries

Edit the SQL queries in [`lib/db/dashboardQueries.ts`](lib/db/dashboardQueries.ts) to match your exact schema:

1. **For table/column name differences**: Update the `FROM`, `SELECT`, and `WHERE` clauses
2. **For derived columns**: The queries already handle deriving `confidence_tier`, `is_correct` if not stored
3. **For new metrics**: Add new query functions following the existing patterns

Each function includes comments explaining the expected schema structure. Example:

```typescript
// Change 'predictions' to your actual table name
// Change 'predicted_winner_probability' to your column name
const sql = `
  SELECT ...
  FROM predictions
  WHERE event_id = $1
`;
```

## Project Structure

```
app/
  ├── page.tsx                    # Main dashboard
  ├── layout.tsx                  # Root layout
  ├── globals.css                 # Global styles
  ├── analytics/page.tsx          # Analytics page
  ├── events/
  │   ├── page.tsx               # Past events list
  │   └── [eventId]/page.tsx      # Event detail
  └── predictions/
      └── upcoming/page.tsx       # Upcoming predictions

components/
  ├── DashboardStatCard.tsx       # Stat card component
  ├── AccuracyOverTimeChart.tsx   # Line chart
  ├── ConfidenceTierChart.tsx     # Bar chart
  ├── CalibrationChart.tsx        # Scatter plot
  ├── UpcomingPredictionsTable.tsx # Predictions preview
  ├── PastEventsTable.tsx         # Events list
  ├── FightResultTable.tsx        # Fight details
  ├── ConfidenceBadge.tsx         # Confidence badge
  └── CorrectnessBadge.tsx        # Correct/incorrect badge

lib/
  ├── db/
  │   ├── client.ts              # Database connection
  │   └── dashboardQueries.ts     # SQL query adapter layer
  ├── types.ts                   # TypeScript interfaces
  └── utils.ts                   # Helper functions

public/                          # Static assets (if needed)
```

## Key Components

### Database Client (`lib/db/client.ts`)

Raw PostgreSQL connection using the `pg` package. Functions:

- `getPool()`: Get or create connection pool
- `query<T>(sql, params)`: Execute query, return array of results
- `queryOne<T>(sql, params)`: Execute query, return single result or null

### Query Adapter (`lib/db/dashboardQueries.ts`)

High-level functions for dashboard data access:

- `getDashboardSummary()`: Overall accuracy, prediction counts, model version
- `getUpcomingPredictions()`: Fights not yet completed
- `getPastEventsSummary()`: Historical event accuracy
- `getEventDetail(eventId)`: Detailed results for one event
- `getAccuracyByConfidenceTier()`: Performance by prediction confidence
- `getAccuracyOverTime()`: Cumulative accuracy over time
- `getAccuracyByModelVersion()`: Compare different model versions
- `getCalibrationBuckets()`: Predicted vs actual win rate buckets

### Utility Functions (`lib/utils.ts`)

Formatting and styling helpers:

- `formatPercentage(value)`: Convert 0-1 to "X.X%"
- `formatProbability(value)`: Format win probability
- `formatDate(date)`: Consistent date formatting
- `formatNumber(value)`: Add thousand separators
- `getConfidenceColor(tier)`: Tailwind classes for confidence badges
- `getCorrectnessColor(isCorrect)`: Color for correct/incorrect badges

## Styling and Theme

The dashboard uses a dark sports analytics theme with red accents, matching your Power BI dashboard:

- **Background**: Gray-950 to Gray-900 (dark)
- **Primary Accent**: Red-600/700 for key metrics and highlights
- **Text**: Gray-50 to Gray-500 (light on dark)
- **Borders**: Gray-800 dividers
- **Cards**: Gray-900 backgrounds with Gray-800 borders

To customize colors, edit `tailwind.config.ts` and update component Tailwind classes.

## Error Handling and Fallbacks

- **Database Connection Errors**: Display error message with connection details
- **Empty States**: Show helpful messages when no data is available
- **Loading States**: Skeleton loaders while data fetches
- **Null Values**: Format functions return "N/A" for missing data

## Performance Considerations

- Server Components used where possible to reduce client-side JavaScript
- Suspense boundaries for streaming UI
- Minimal client-side interactivity (mostly read-only)
- Connection pooling for database queries
- Charts render client-side with Recharts (memoized)

## Development

### Running Tests

```bash
npm run lint
```

### Code Structure

- Keep data fetching in Server Components (`async` page components)
- Use Client Components (`'use client'`) only for interactive charts and filters
- Database queries in `lib/db/dashboardQueries.ts`
- UI components in `components/`

### Adding New Pages

1. Create page file: `app/your-page/page.tsx`
2. Add data fetching function in `lib/db/dashboardQueries.ts`
3. Use Suspense for loading states
4. Build UI with existing components

### Adding New Charts

1. Create component: `components/YourChart.tsx`
2. Mark with `'use client'` directive
3. Use Recharts library
4. Accept typed data from dashboard page
5. Import in page and pass data

## Environment Variables

- `DATABASE_URL` (required): PostgreSQL connection string

## Troubleshooting

### "DATABASE_URL environment variable is not set"

Ensure `.env.local` exists in the project root with a valid PostgreSQL connection string.

### "Database connection error"

Check:
- PostgreSQL server is running
- Connection string is correct (user, password, host, port, database name)
- Firewall allows connection
- User has permission to access database

### Charts not rendering

- Ensure data is being returned from query functions
- Check browser console for errors
- Verify data matches expected format in `lib/types.ts`

### Confidence tier derivation not working

Edit the `CASE` statements in `dashboardQueries.ts`:

```typescript
CASE 
  WHEN uncertainty_flag = true THEN 'Uncertain'
  WHEN predicted_winner_probability >= 0.70 THEN 'High'
  WHEN predicted_winner_probability >= 0.60 THEN 'Medium'
  ELSE 'Low'
END as confidence_tier
```

Adjust thresholds as needed (currently: High ≥70%, Medium ≥60%, Low <60%, Uncertain flag).

## Production Deployment

1. Set `DATABASE_URL` environment variable in your deployment platform
2. Run `npm run build` to generate optimized bundle
3. Deploy with `npm start` or use managed hosting (Vercel, AWS, etc.)
4. Ensure PostgreSQL database is accessible from deployment environment
5. Monitor error logs for connection issues

## License

MIT

## Support

For issues or questions about the dashboard, refer to the setup instructions above or check the database schema mapping section to customize SQL queries for your exact table structure.
