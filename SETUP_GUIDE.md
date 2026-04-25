# Freelance API — Setup Guide

A complete step-by-step guide to set up and run this Node.js + SQL Server REST API from scratch.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [SQL Server 2019/2022](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (Developer or Express edition)
- [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
- [Postman](https://www.postman.com/downloads/) (for testing)

---

## Step 1 — Clone / Download the project

Place the project folder somewhere on your machine, e.g.:
```
C:\Users\yourname\Desktop\freelance-api
```

---

## Step 2 — Install Node dependencies

Open a terminal inside the project folder and run:

```bash
npm install
```

This installs all packages listed in `package.json`, including `express`, `mssql`, `dotenv`, and `nodemon`.

---

## Step 3 — Configure SQL Server

### 3.1 Enable TCP/IP

SQL Server blocks network connections by default. You must enable TCP/IP:

1. Press **Win + R** → type `SQLServerManager17.msc` → Enter  
   *(If that fails try `SQLServerManager16.msc` or `SQLServerManager15.msc` depending on your SQL Server version)*
2. Expand **SQL Server Network Configuration** → **Protocols for MSSQLSERVER**
3. Right-click **TCP/IP** → **Enable**
4. Restart the SQL Server service (see Step 3.4)

### 3.2 Enable Mixed Authentication Mode

By default SQL Server only allows Windows Authentication. The app uses SQL Server Authentication, so you must enable Mixed Mode:

1. Open **SSMS** and connect to your server
2. Right-click the server name → **Properties** → **Security**
3. Select **SQL Server and Windows Authentication mode**
4. Click **OK**

### 3.3 Enable the `sa` login and set a password

In SSMS, open a **New Query** window and run:

```sql
ALTER LOGIN sa ENABLE;
ALTER LOGIN sa WITH PASSWORD = 'YourPasswordHere';
```

> Choose a strong password. You'll put it in `.env` in the next step.

### 3.4 Restart the SQL Server service

The authentication mode change requires a service restart. Run this in PowerShell **as Administrator**:

```powershell
Restart-Service -Name MSSQLSERVER -Force
```

Or open **Services** (`services.msc`), find **SQL Server (MSSQLSERVER)**, and restart it manually.

> **Note:** If you are using a named instance (e.g. SQLEXPRESS), the service name will be `MSSQL$SQLEXPRESS` and the server name in `.env` will be `.\SQLEXPRESS`.

---

## Step 4 — Create the database and run the schema

1. Open SSMS and connect to your server
2. Run this to create the database:

```sql
CREATE DATABASE freelance_db;
```

3. Open the file `schema-sqlserver.sql` from the project folder in SSMS
4. Make sure the target database is `freelance_db` (it starts with `USE freelance_db;`)
5. Press **F5** to execute — all tables, indexes, and views will be created

If your database already exists from an older copy of this project, run this one-off upgrade before testing buyer revision requests:

```sql
ALTER TABLE Order_Submissions ALTER COLUMN file_url NVARCHAR(255) NULL;
```

---

## Step 5 — Configure the `.env` file

Create a file named `.env` in the project root (it may already exist — edit it):

```env
PORT=3000
DB_HOST=YOUR_SERVER_NAME
DB_USER=sa
DB_PASSWORD="YourPasswordHere"
DB_NAME=freelance_db
DB_ENCRYPT=true
```

**Important notes:**
- `DB_HOST` — your SQL Server instance name. Find it in SSMS in the top-left connection dialog (e.g. `DESKTOP-ABC123` or `.\SQLEXPRESS`)
- `DB_PASSWORD` — **wrap the value in double quotes** if it contains special characters like `#`, `@`, `!` — otherwise dotenv will silently truncate it at the special character
- `DB_ENCRYPT=true` — required by the `mssql` driver; it uses a self-signed cert so `trustServerCertificate` is also set to `true` in `db.js`

---

## Step 6 — Start the server

```bash
npm run dev
```

You should see:
```
[nodemon] starting `node app.js`
Server running on http://localhost:3000
```

If you see a `ConnectionError: Login failed for user 'sa'` error:
- Double-check your `.env` password is quoted correctly
- Make sure the SQL Server service was restarted after enabling mixed auth mode
- Confirm the `sa` login is enabled in SSMS

---

## Step 7 — Test the API in Postman

### Check the server is alive
```
GET http://localhost:3000/
```
Expected: `{ "message": "Freelance Platform API is running" }`

### Create a buyer
```
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "username": "buyer1",
  "email": "buyer1@test.com",
  "password": "pass123",
  "role": "buyer"
}
```

### Create a seller
```
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "username": "seller1",
  "email": "seller1@test.com",
  "password": "pass123",
  "role": "seller"
}
```

Save the `user_id` values from both responses.

### Create a gig (seller posts a service)
```
POST http://localhost:3000/api/gigs
Content-Type: application/json

{
  "seller_id": 2,
  "title": "I will build your website",
  "description": "Full stack web development",
  "category": "Web Development",
  "price": 500,
  "delivery_days": 7
}
```

### Place an order (buyer orders the gig)
```
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "gig_id": 1,
  "buyer_id": 1,
  "seller_id": 2,
  "price": 500
}
```

### Recommended test sequence

| Step | Method | Endpoint |
|------|--------|----------|
| 1 | POST | `/api/users` (buyer) |
| 2 | POST | `/api/users` (seller) |
| 3 | POST | `/api/gigs` |
| 4 | POST | `/api/orders` |
| 5 | POST | `/api/milestones` |
| 6 | POST | `/api/submissions` |
| 7 | PATCH | `/api/orders/:id` (update status) |
| 8 | POST | `/api/reviews` |
| 9 | POST | `/api/invoices` |
| 10 | PATCH | `/api/invoices/:id/pay` |
| 11 | POST | `/api/wallet` |
| 12 | GET | `/api/reports` |

---

## Project Structure

```
freelance-api/
├── app.js                  # Entry point — creates Express server, mounts routes
├── db.js                   # SQL Server connection pool + query wrapper
├── .env                    # Environment variables (DB credentials, port)
├── package.json            # Dependencies and scripts
├── schema-sqlserver.sql    # T-SQL schema — run once in SSMS to create tables
├── routes/                 # URL definitions — maps HTTP method + path to controller
│   ├── users.js
│   ├── gigs.js
│   └── ...
└── controllers/            # Business logic — reads req, runs SQL, sends res
    ├── usersController.js
    ├── gigsController.js
    └── ...
```

---

## How the code works

```
Postman request
    → app.js         (receives request, routes it)
    → routes/*.js    (matches URL pattern, calls correct controller function)
    → controllers/*  (runs SQL query via db.js, sends JSON response)
    → db.js          (executes parameterized query against SQL Server)
    → SQL Server     (returns data)
```

### Key concepts

| Concept | Explanation |
|---------|-------------|
| `require()` | Imports a module — like `import` in other languages |
| `async/await` | Waits for a database call to finish before continuing |
| `req.body` | The JSON data sent in the request body (from Postman) |
| `req.params.id` | The value from a URL like `/users/5` |
| `res.json()` | Sends a JSON response back to the caller |
| `try/catch` | Catches DB or runtime errors and returns them as JSON instead of crashing |
| `?` placeholders | Prevent SQL injection — values are passed separately from the query |
| `OUTPUT INSERTED.x` | SQL Server syntax to return the new row's ID after INSERT |
| Connection pool | Keeps DB connections open and reuses them across requests |

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` on port 1433 | TCP/IP disabled | Enable TCP/IP in SQL Server Configuration Manager |
| `Login failed for user ''` | Windows Auth — tedious can't use it by default | Set `DB_USER` and `DB_PASSWORD` in `.env` |
| `Login failed for user 'sa'` | Mixed auth mode not yet applied | Restart the SQL Server service after enabling mixed mode |
| `Login failed for user 'sa'` (still) | Password truncated by `#` in `.env` | Wrap password in double quotes: `DB_PASSWORD="pass#word"` |
| `Cannot find SQLServerManager16.msc` | Wrong version number | Try `17`, `16`, `15`, or `14` depending on your SQL Server version |
| Table is empty after POST | Field name mismatch in request body | Check controller for expected field names (e.g. `password` vs `password_hash`) |
| `cascade cycle` error in schema | Multiple FK cascade paths to same table | Change `ON DELETE CASCADE` to `ON DELETE NO ACTION` on the conflicting FK |
