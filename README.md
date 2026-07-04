# API Monitoring & Alerting Platform

A production-ready SaaS platform for monitoring APIs and websites in real time. Users can register endpoints and continuously monitor their availability, response time, and overall health. The platform detects failures, records incidents, generates analytics, and sends notifications when predefined conditions are met.

The system is built around an event-driven architecture using BullMQ and Redis, enabling reliable background processing and scalable monitoring of thousands of endpoint checks.

---

## Architecture

The following diagram illustrates the overall system architecture and request flow.

<p align="center">
  <img src<img width="1536" height="1024" alt="Architecture API-Monitoring" src="https://github.com/user-attachments/assets/a7b6cb32-af87-4d28-82e8-e90af0122bed" />
</p>

---

## Key Features

- Real-time API and website monitoring
- Distributed background workers using BullMQ and Redis
- Live dashboard powered by Socket.IO
- Incident detection and automatic alerting
- Analytics with uptime and latency metrics
- Stripe-powered subscription management
- Production-ready retry logic with exponential backoff
- Dead Letter Queue for failed monitoring jobs
- Secure authentication and API key support

---

## Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite
- Recharts

### Backend

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- TimescaleDB
- Redis
- BullMQ
- Socket.IO
- Stripe

---

## How It Works

1. A user creates a monitor by providing an API or website endpoint.
2. BullMQ schedules monitoring jobs at the configured interval.
3. Worker processes execute HTTP requests and measure response time.
4. Monitoring results are stored in PostgreSQL and TimescaleDB.
5. The dashboard is updated in real time using Socket.IO.
6. When failures exceed configured thresholds, incidents are created and notifications are sent.
7. Subscription plans determine monitoring limits and scheduling intervals.

---

## Project Structure

```text
client/
server/
docs/
```

---

## Running Locally

```bash
git clone https://github.com/<username>/api-monitoring.git

cd api-monitoring
```

Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

Configure environment variables and start the backend, frontend, and worker processes.

---

## Future Improvements

- Public status pages
- Multi-region monitoring
- Kubernetes deployment
- Prometheus and Grafana integration

---

## License

This project is licensed under the MIT License.
