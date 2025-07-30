# pocketsmith-transaction-matcher

Take CSVs from other platforms of transactions and match them to transactions in pocketsmith, then update their Payees to match the transactions so that pocketsmith can fix the categorisation via category rules.

## Setup

### Environment Configuration

This application uses environment variables for configuration. Follow these steps to set up your environment:

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file with your values:**
   ```bash
   # Required: Your PocketSmith API key
   POCKETSMITH_API_KEY=your_actual_api_key_here

   # Optional: Adjust other settings as needed
   MATCHING_THRESHOLD=0.8
   BATCH_SIZE=100
   ```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POCKETSMITH_API_KEY` | Your PocketSmith API key | - | ✅ |
| `POCKETSMITH_BASE_URL` | PocketSmith API base URL | `https://api.pocketsmith.com/v2` | ❌ |
| `UNIRATE_API_KEY` | UniRate API key | - | ✅ |
| `NODE_ENV` | Application environment | `development` | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `DAYS_TOLERANCE` | Days tolerance for transaction date matching | `2` | ❌ |
| `DATE_RANGE_BUFFER_DAYS` | Buffer days for PocketSmith fetch date range | `5` | ❌ |
| `AMOUNT_TOLERANCE_EXACT` | Amount tolerance for same-currency matching | `0.001` | ❌ |
| `AMOUNT_TOLERANCE_FOREIGN_PERCENT` | Percentage tolerance for foreign currency matching | `0.1` | ❌ |
| `API_RATE_LIMIT_MS` | Delay between API calls (milliseconds) | `1000` | ❌ |

## Development

### Running the Application

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

The application will automatically load environment variables from your `.env` file.
