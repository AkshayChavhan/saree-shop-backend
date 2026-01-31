# Saree Shop Backend

Express.js backend API for the Saree Shop e-commerce platform.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Clerk
- **Payments**: Stripe & Razorpay
- **Image Storage**: Cloudinary

## Getting Started

### Prerequisites

- Node.js 20 or higher
- MongoDB database (MongoDB Atlas recommended)
- Clerk account for authentication
- (Optional) Stripe/Razorpay accounts for payments
- (Optional) Cloudinary account for image uploads

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/saree-shop-backend.git
   cd saree-shop-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

5. **Push database schema**
   ```bash
   npm run prisma:push
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3001`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:studio` | Open Prisma Studio GUI |

## API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/products` - List products
- `GET /api/products/:slug` - Get product details
- `GET /api/categories` - List categories

### Protected Endpoints (Requires Auth)
- `GET /api/cart` - Get cart
- `POST /api/cart` - Add to cart
- `GET /api/orders` - List orders
- `POST /api/payments/create-intent` - Create payment

### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/products` - Manage products
- `GET /api/admin/orders` - Manage orders

### Webhook Endpoints
- `POST /api/webhooks/clerk` - Clerk user events
- `POST /api/webhooks/stripe` - Stripe payment events
- `POST /api/webhooks/razorpay` - Razorpay payment events

## Deployment

### Deploy to GCP Cloud Run

```bash
gcloud run deploy saree-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=..." \
  --set-env-vars "CLERK_SECRET_KEY=..." \
  --set-env-vars "FRONTEND_URL=..."
```

See [docs/GCP-SETUP.md](../saree-shop/docs/GCP-SETUP.md) for detailed deployment instructions.

## Project Structure

```
src/
├── index.ts              # Entry point
├── routes/               # API routes
│   ├── products.routes.ts
│   ├── cart.routes.ts
│   ├── admin/            # Admin routes
│   └── webhooks/         # Webhook handlers
├── middleware/           # Express middleware
├── lib/                  # Utilities
└── types/                # TypeScript types
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MongoDB connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk API secret |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `STRIPE_SECRET_KEY` | No | Stripe API secret |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |

## License

ISC
