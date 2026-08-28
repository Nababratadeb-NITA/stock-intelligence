\# Stock Intelligence



Stock Intelligence is a full-stack stock market intelligence application that

collects market data, validates it, calculates technical indicators and

intelligence signals, and exposes the results through a FastAPI backend and

Next.js frontend.



\## Architecture



PostgreSQL

&#x20;   ↓

Market Data Pipeline

&#x20;   ↓

Data Validation

&#x20;   ↓

Technical Indicators

&#x20;   ↓

Investor Stock Dashboard

&#x20;   ↓

FastAPI

&#x20;   ↓

Next.js

&#x20;   ↓

Browser





\## Project Structure



```text

stock-intelligence/

│

├── backend/

│   ├── api/

│   │   ├── main.py

│   │   └── \_\_init\_\_.py

│   │

│   └── data/

│       ├── market\_ingest.py

│       ├── validate\_market\_data.py

│       ├── company\_resolver.py

│       ├── scheduler.py

│       │

│       └── providers/

│           ├── market\_data\_provider.py

│           ├── provider\_factory.py

│           ├── provider\_config.py

│           ├── yahoo\_provider.py

│           ├── bse\_provider.py

│           └── test\_provider.py

│

├── frontend/

│   ├── app/

│   │   ├── page.tsx

│   │   ├── globals.css

│   │   ├── layout.tsx

│   │   │

│   │   └── stocks/

│   │       └── \[ticker]/

│   │           └── page.tsx

│   │

│   └── lib/

│       └── api.ts

│

└── README.md

