# ⚡ PayPulse — UPI-Style Payment System

A full-stack mini payment system built with Node.js, Express, MongoDB, and EJS. Supports peer-to-peer money transfers via UPI ID, phone number, or email — with atomic database transactions and JWT authentication.

---

## 🚀 Features

| Feature | Details |
|---|---|
| **Authentication** | JWT via HTTP-only cookies, bcrypt password hashing |
| **Wallet System** | Each user gets ₹1000 on signup (configurable) |
| **UPI ID** | Auto-generated (e.g. `9876543210@paypulse`) |
| **Money Transfer** | Send by email / phone / UPI ID |
| **Atomic Transactions** | `session.withTransaction()` — rollback on failure |
| **Transaction History** | Paginated, with debit/credit tagging |
| **Input Validation** | `express-validator` on all routes |
| **Error Handling** | Centralised middleware, operational vs system errors |

---

## 🗂️ Project Structure

```
paypulse/
├── app.js                    # Express entry point
├── package.json
├── .env                      # Environment variables
│
├── config/
│   └── db.js                 # MongoDB connection
│
├── controllers/
│   ├── authController.js     # Register / login / logout
│   └── transferController.js # Transfer, history, dashboard
│
├── middleware/
│   ├── auth.js               # JWT protect + guestOnly
│   ├── errorHandler.js       # Global error handler + asyncHandler
│   └── validate.js           # express-validator schemas
│
├── models/
│   ├── User.js               # User + wallet balance + UPI ID
│   └── Transaction.js        # Transaction records
│
├── routes/
│   ├── authRoutes.js         # /auth/*
│   └── transferRoutes.js     # /dashboard, /send, /transfer, /transactions
│
├── views/
│   ├── auth/
│   │   ├── signup.ejs
│   │   └── login.ejs
│   ├── partials/
│   │   ├── head.ejs
│   │   └── navbar.ejs
│   ├── dashboard.ejs
│   ├── send-money.ejs
│   ├── transactions.ejs
│   └── error.ejs
│
└── public/
    └── css/
        └── main.css
```

---

## ⚙️ Setup

### Prerequisites
- Node.js v18+
- MongoDB (must run as a **Replica Set** for transactions)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env`:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/paypulse
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
DEFAULT_WALLET_BALANCE=1000
```

### 3. Start MongoDB as a Replica Set

Mongoose `session.withTransaction()` requires a replica set.

**macOS (Homebrew):**
```bash
# Edit mongod config to add replica set name
echo "replication:\n  replSetName: rs0" >> /opt/homebrew/etc/mongod.conf
brew services restart mongodb-community

# Initialize replica set (run once)
mongosh --eval "rs.initiate()"
```

**Linux / Ubuntu:**
```bash
# Add to /etc/mongod.conf:
# replication:
#   replSetName: "rs0"

sudo systemctl restart mongod
mongosh --eval "rs.initiate()"
```

**Docker (easiest for dev):**
```bash
docker run -d -p 27017:27017 \
  --name mongo-rs \
  mongo:7 mongod --replSet rs0 --bind_ip_all

sleep 3
docker exec mongo-rs mongosh --eval "rs.initiate()"
```

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Open: **http://localhost:3000**

---

## 📡 API Reference

### Auth

| Method | Route | Body | Auth |
|---|---|---|---|
| GET | `/auth/signup` | — | Guest only |
| POST | `/auth/signup` | `{name, email, phone?, password, confirmPassword}` | Guest only |
| GET | `/auth/login` | — | Guest only |
| POST | `/auth/login` | `{email, password}` | Guest only |
| GET | `/auth/logout` | — | — |

### App (all require JWT cookie)

| Method | Route | Description |
|---|---|---|
| GET | `/dashboard` | Wallet balance, stats, recent transactions |
| GET | `/send` | Send money form |
| POST | `/transfer` | Execute money transfer |
| GET | `/transactions` | Full paginated history |

### POST `/transfer` Body
```json
{
  "recipient": "9876543210@paypulse",
  "transferMethod": "upi",
  "amount": 500,
  "note": "Lunch split"
}
```
`transferMethod`: `"upi"` | `"phone"` | `"email"`

### GET `/transactions` Query Params
- `page` — page number (default: 1)
- `limit` — items per page (default: 10)

---

## 🔐 Security Notes

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT stored in **HTTP-only cookie** (XSS safe)
- **SameSite: strict** cookie policy (CSRF mitigation)
- Passwords **never returned** in API responses (`select: false`)
- MongoDB **transactions with rollback** on any failure
- Input sanitized with **express-validator**

---

## 🏦 How Atomic Transfers Work

```
POST /transfer
  │
  ├── Find receiver by UPI/phone/email
  │
  ├── mongoose.startSession()
  │
  └── session.withTransaction(async () => {
        1. Fetch sender with session lock
        2. Check sender balance >= amount
        3. Deduct from sender.walletBalance
        4. Add to receiver.walletBalance
        5. Create Transaction record (status: "success")
      })
      │
      ├── All steps OK → COMMIT → return success
      └── Any step fails → ROLLBACK → log failed Transaction
```

---

## 🧪 Quick Test Flow

1. Sign up as **User A** → gets ₹1000
2. Sign up as **User B** → gets ₹1000 — note their UPI ID (e.g. `userb@paypulse`)
3. Log in as **User A**
4. Send ₹200 to `userb@paypulse`
5. Check User A balance → ₹800
6. Log in as **User B** → balance ₹1200
7. View transaction history on both accounts

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `express` | Web framework |
| `mongoose` | MongoDB ODM + transactions |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | JWT signing / verification |
| `express-validator` | Input validation |
| `ejs` | Server-side HTML templating |
| `cookie-parser` | HTTP-only cookie support |
| `dotenv` | Environment variables |
# littleBonnyPyUrMoni
