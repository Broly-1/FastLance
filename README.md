# FastLance

A full-stack freelance marketplace built around a relational core — escrow payments, milestone payouts, and dispute mediation modelled directly in SQL Server.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
![SQL Server](https://img.shields.io/badge/SQL_Server-MSSQL-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white)

Built as my Database Systems semester project at FAST NUCES (Spring 2026).

---

## Why this project

Most marketplace clones stop at "list a service, click buy." The interesting problem is what happens to the money in between — how funds are held, released, refunded, and reconciled when two parties disagree. FastLance is built around that question, so the design work lives in the schema rather than the UI.

## Core systems

**Escrow & milestone payouts**
Funds move through an internal wallet, not directly between users. When a buyer places an order the amount is debited and held; it is released to the seller incrementally as milestones are approved. Every movement runs inside an atomic transaction, so a partial failure can never leave money in two places at once.

**Order lifecycle**
Orders progress through Pending → In Progress → Delivered → Completed, with Cancelled and Disputed as terminal branches. Deadlines and revision counts are enforced at the database layer via `CHECK` constraints and triggers rather than trusted to application code.

**Dispute mediation**
Either party can raise a dispute with a reason and evidence. Opening one freezes the associated escrow balance and pauses milestone deadlines until an administrator resolves it — including issuing manual refunds.

**Ledger & transaction history**
Every credit and debit is logged with a type (TopUp, OrderPayment, Refund, Withdrawal, Earning) and linked back to its originating order or milestone, so any wallet balance can be reconstructed from the ledger alone.

**Supporting modules**
Contextual messaging tied to orders · invoicing with due/overdue tracking · reviews with seller replies · asynchronous notification engine · admin moderation for users, gigs, tags, and reviews · reporting endpoints for system and financial analytics.

## Database design notes

- Normalised relational schema covering users, gigs, orders, submissions, milestones, invoices, wallets, transactions, reviews, disputes, and notifications
- Indexes on gig search paths (category, tags, price) to keep discovery queries fast as listings grow
- `CHECK` constraints for role validity, rating bounds, and non-negative balances
- Triggers to advance order state and increment revision counts without relying on client-side sequencing
- Full DDL in [`24L-0503-DB-SCHEMA.sql`](24L-0503-DB-SCHEMA.sql) and [`schema-sqlserver.sql`](schema-sqlserver.sql); representative queries in [`queries.sql`](queries.sql)

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express |
| Database | Microsoft SQL Server |
| Auth | Hashed credentials, role-based access (Buyer / Seller / Both) |

## Getting started

```bash
git clone https://github.com/Broly-1/FastLance.git
cd FastLance

# Backend
npm install
# configure your MSSQL connection in db.js / .env
node check_db.js        # verify connectivity
npm run dev             # nodemon

# Frontend
cd client
npm install
npm run dev
```

Apply `schema-sqlserver.sql` to a fresh database before first run. Full walkthrough in [`SETUP_GUIDE.md`](SETUP_GUIDE.md); complete feature inventory in [`FEATURES.md`](FEATURES.md).

## What I took away from it

Designing the escrow system taught me more about transaction isolation than any lecture did — specifically, that "release the funds" and "mark the milestone complete" have to be the same atomic operation or you eventually pay someone twice. The dispute flow forced the same discipline in reverse: freezing state correctly is harder than changing it.

---

**Hassan Kamran** · [LinkedIn](https://www.linkedin.com/in/hassankamran3) · hassangaming111@gmail.com
