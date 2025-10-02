Trade Equity Curve Tracker

A simple HTML/CSS/JS + Supabase project that:

Shows a running equity curve (balance over time).

Lets you add trades (symbol + PnL).

Stores trades in Supabase.

Displays a table of trades with timestamps, PnL, and running equity.

Automatically updates the equity chart (green for up moves, red for down moves).

-Features

Add a new trade with symbol + PnL input.

Trades are saved to a trades table in Supabase.

Equity curve updates instantly when trades are added.

Supports a starting balance via settings table.

Equity curve is drawn on an HTML <canvas>.

Color-coded:

📈 Green → balance goes up

📉 Red → balance goes down


- How It Works

Starting balance is loaded from the settings table.

Every time you add a trade:

A row is inserted into the trades table.

Table refreshes to show the new trade.

Equity series is recomputed and the curve redraws instantly.

🖼 Screenshot
