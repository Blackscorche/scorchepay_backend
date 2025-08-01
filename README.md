## API Endpoints: Giftcard & VTU

### Approve Giftcard (Giftcard Verifier Only)
**POST** `/api/giftcard/approve`

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```
{
  "proposalId": "<giftcard_proposal_id>",
  "amount": 1000
}
```

**Response:**
- Success: `{ message: "Giftcard approved and funds transferred" }`

### VTU Purchase (User)
**POST** `/api/giftcard/purchase-vtu`

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```
{
  "amount": 500
}
```

**Response:**
- Success: `{ message: "VTU purchase successful and funds deducted" }`

---

### How to Connect (Frontend or API Client)

1. **Authenticate**: Log in to get a JWT token.
2. **Set Authorization Header**: For all protected endpoints, set `Authorization: Bearer <your_token>`.
3. **Call Endpoints**:
   - To approve a giftcard: `POST /api/giftcard/approve` with `proposalId` and `amount` in the body (giftcardVerifier only).
   - To purchase VTU: `POST /api/giftcard/purchase-vtu` with `amount` in the body (any user).

You can use tools like Postman, Insomnia, or your frontend code (e.g., Axios, fetch) to connect.

# ScorchePay Backend

## Features
- JWT authentication, role-based access (user, admin, giftcardVerifier)
- Wallet system (NGN & USDT, atomic updates)
- Giftcard module (submit, approve, reject, wallet transfer)
- N3Data integration: Airtime, Data, Cable TV, Electricity, Betting, Education
- Secure webhooks, file uploads (Cloudinary), email verification
- Admin tools, chat, audit logs
- Security: Helmet, CORS, rate limiter, input sanitization

## N3Data Endpoints
All endpoints require authentication (JWT):

- `POST /api/n3data/airtime` — Buy airtime
- `POST /api/n3data/data` — Buy data
- `POST /api/n3data/cabletv` — Pay for cable TV
- `POST /api/n3data/electricity` — Pay electricity bill
- `POST /api/n3data/betting` — Fund betting account
- `POST /api/n3data/education` — Pay education bill

## Giftcard Approval
- `POST /api/giftcard/approve` — GiftcardVerifier approves a giftcard, debits their wallet, credits user, logs transaction

## Security
- All sensitive configs in `.env`
- Helmet, CORS, rate limiter, mongo-sanitize enabled
- All endpoints protected by JWT and role-based middleware

## Setup
1. Copy `.env.example` to `.env` and fill in your real values
2. Run `npm install`
3. Start with `npm run dev` or `npm start`

## Integration
- Use the above endpoints from your frontend
- All requests must include a valid JWT in the `Authorization` header

## License
MIT
