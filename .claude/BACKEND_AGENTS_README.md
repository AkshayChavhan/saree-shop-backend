# Custom Claude Code Agents for Saree Shop Backend

## Overview

This guide explains the 4 specialized Claude Code agents created for the **saree-shop-backend** Express.js API. These agents provide expert assistance for backend development, database management, admin features, and third-party integrations.

## What Are These Agents?

Custom agents are specialized AI assistants within Claude Code that have deep knowledge about your backend architecture. They only run when you explicitly invoke them or when Claude Code invokes them during your session. **They are NOT autonomous bots** - they're on-demand experts.

## Available Agents

### 1. Backend API Developer Agent (`backend-api-developer`)
**File**: `.claude/agents/backend-api-developer.md`
**Purpose**: REST API endpoint development specialist

**Expertise**:
- Express.js route creation and management
- Request/response validation with TypeScript
- Prisma ORM database operations
- RESTful API design patterns
- Authentication middleware (Clerk JWT)
- Error handling with AppError class
- Pagination, filtering, sorting

**Use When**:
- Creating new API endpoints
- Implementing business logic
- Adding request validation
- Debugging API issues
- Optimizing route performance
- Implementing authentication

**Example Usage**:
```
"Use the backend-api-developer agent to create a GET /api/reviews endpoint with pagination"
```

---

### 2. Backend Database Agent (`backend-database-agent`)
**File**: `.claude/agents/backend-database-agent.md`
**Purpose**: MongoDB schema design and Prisma optimization specialist

**Expertise**:
- Prisma schema design (MongoDB)
- Database query optimization
- Index strategy implementation
- Data migrations and transformations
- Transaction management
- Soft delete patterns
- Referential integrity

**Use When**:
- Adding new Prisma models
- Optimizing slow queries
- Creating database migrations
- Designing schema relationships
- Adding indexes for performance
- Handling data integrity issues

**Example Usage**:
```
"Use the backend-database-agent to add a Coupon model with relation to Order"
```

---

### 3. Backend Admin Features Agent (`backend-admin-agent`)
**File**: `.claude/agents/backend-admin-agent.md`
**Purpose**: Admin panel and management interface specialist

**Expertise**:
- Admin dashboard development
- Analytics and reporting endpoints
- Resource management (CRUD with admin auth)
- Order management workflows
- User role management (Admin/SuperAdmin)
- Bulk operations
- System monitoring

**Use When**:
- Creating admin dashboards
- Building analytics endpoints
- Implementing management workflows
- Adding admin-only features
- Creating reports
- Managing user roles

**Example Usage**:
```
"Use the backend-admin-agent to create a sales report endpoint with date filtering"
```

---

### 4. Backend Integration Agent (`backend-integration-agent`)
**File**: `.claude/agents/backend-integration-agent.md`
**Purpose**: Third-party service and webhook integration specialist

**Expertise**:
- Webhook implementation (Clerk, Stripe, Razorpay)
- Payment gateway integration
- Signature verification (Svix, Stripe, Razorpay)
- Cloudinary image management
- External API integration
- Retry and error handling

**Use When**:
- Integrating payment gateways
- Implementing webhooks
- Adding external services
- Processing payment events
- Managing image uploads
- Debugging integration issues

**Example Usage**:
```
"Use the backend-integration-agent to add SendGrid email notifications"
```

---

## How to Use These Agents

### Method 1: Direct Request (Recommended)

Simply ask Claude Code to use the agent:

```
You: "Use the backend-api-developer agent to create a new endpoint for product reviews"

Claude: *Invokes the Backend API Developer Agent*
Agent: *Analyzes requirements, creates route file, implements validation, returns code*
Claude: *Reports changes to you*
```

### Method 2: Automatic Invocation

Claude Code automatically chooses the right agent based on your request:

```
You: "Add a Coupon model to the database"
→ Automatically invokes backend-database-agent

You: "Create an admin dashboard with sales statistics"
→ Automatically invokes backend-admin-agent

You: "Implement Stripe payment webhook"
→ Automatically invokes backend-integration-agent
```

### Method 3: Multi-Agent Collaboration

For complex tasks, multiple agents work together:

```
You: "Add a coupon system with admin management"

Flow:
1. backend-database-agent → Creates Coupon model
2. backend-api-developer → Creates API endpoints
3. backend-admin-agent → Adds admin management interface
4. backend-integration-agent → Adds webhook for coupon usage tracking
```

## Agent Capabilities Matrix

| Capability | API Developer | Database | Admin | Integration |
|------------|---------------|----------|-------|-------------|
| Create routes | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐ |
| Schema design | ⭐ | ⭐⭐⭐ | ⭐ | ⭐ |
| Query optimization | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| Admin features | ⭐ | ⭐ | ⭐⭐⭐ | ⭐ |
| Webhooks | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ |
| Payment integration | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ |
| Middleware | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐ |
| Validation | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |

⭐⭐⭐ = Primary expertise | ⭐⭐ = Secondary expertise | ⭐ = Basic knowledge

## Project Context

All agents have deep understanding of:

### Technology Stack
- **Backend**: Express.js 4.21.0, Node.js 18+
- **Language**: TypeScript 5.8.3 (strict mode)
- **Database**: MongoDB with Prisma ORM 6.12.0
- **Authentication**: Clerk 5.0.0 (JWT tokens)
- **Payments**: Stripe 17.0.0, Razorpay 2.9.0
- **Images**: Cloudinary 2.0.0
- **Security**: Helmet, CORS

### API Architecture
- **Base URL**: `http://localhost:3001`
- **Public Routes**: `/api/` - No authentication required
- **Protected Routes**: `/api/` - Requires `requireAuth` middleware
- **Admin Routes**: `/api/admin/` - Requires `requireAdmin`
- **Webhooks**: `/api/webhooks/` - Signature verification required

### Database Models
- User, Product, Category, Color, Size, Variant
- Cart, CartItem, Wishlist, WishlistItem
- Order, OrderItem, Address
- Review, HeroSlide, PromotionalBanner

### User Roles
- `USER` - Regular customers
- `ADMIN` - Store administrators
- `SUPER_ADMIN` - System administrators

## Quick Start Examples

### Example 1: Create New API Endpoint

```
Task: "Add endpoint to get trending products"

Agent: backend-api-developer

Result:
- Creates `src/routes/products.routes.ts` route
- Implements GET /api/products/trending
- Adds query for most-ordered products in last 30 days
- Returns with proper pagination
- Includes error handling
```

### Example 2: Optimize Database Query

```
Task: "Product listing is slow, optimize the query"

Agent: backend-database-agent

Result:
- Analyzes current query in products.routes.ts
- Adds indexes on categoryId, isActive, price
- Optimizes include/select statements
- Reduces query time from 2s to 200ms
- Documents optimization strategy
```

### Example 3: Add Admin Dashboard Stat

```
Task: "Add low stock alerts to admin dashboard"

Agent: backend-admin-agent

Result:
- Updates src/routes/admin/dashboard.routes.ts
- Adds query for products with stock <= 10
- Includes product name, category, current stock
- Returns with dashboard stats response
- Adds proper admin authorization
```

### Example 4: Integrate Payment Gateway

```
Task: "Add Razorpay payment integration"

Agent: backend-integration-agent

Result:
- Creates src/lib/razorpay.ts initialization
- Adds payment intent creation endpoint
- Implements webhook signature verification
- Updates order status on payment success
- Adds comprehensive error handling
```

## Common Workflows

### Workflow 1: Add New Feature

```
1. Design database schema
   → Use backend-database-agent

2. Create API endpoints
   → Use backend-api-developer

3. Add admin management
   → Use backend-admin-agent

4. Integrate external services (if needed)
   → Use backend-integration-agent
```

### Workflow 2: Debug Production Issue

```
1. Identify the issue type
   → API error: backend-api-developer
   → Database error: backend-database-agent
   → Webhook failure: backend-integration-agent

2. Fix and test
   → Relevant agent implements fix

3. Verify and deploy
   → Review agent changes
```

### Workflow 3: Optimize Performance

```
1. Identify bottleneck
   → Use backend-database-agent for query analysis

2. Optimize code
   → backend-api-developer for route optimization
   → backend-database-agent for query optimization

3. Measure improvement
   → Test with realistic data loads
```

## Best Practices

### ✅ DO

- **Specify the agent** if you know which one you need
- **Provide context** about the current issue/requirement
- **Review all changes** before committing
- **Test thoroughly** using `npm run dev`
- **Check TypeScript** compilation with `npm run build`
- **Run Prisma commands** after schema changes
- **Verify authentication** on protected routes
- **Test with realistic data** to catch edge cases

### ❌ DON'T

- **Trust blindly** - always review agent output
- **Skip testing** - test all changes locally
- **Commit immediately** - review diffs first
- **Ignore warnings** - address TypeScript/Prisma warnings
- **Skip validation** - validate all user inputs
- **Hardcode secrets** - use environment variables
- **Forget migrations** - test schema changes carefully
- **Skip error handling** - handle all error cases

## Environment Setup

Before using agents, ensure your environment is configured:

```env
# .env file
PORT=3001
NODE_ENV=development
DATABASE_URL=mongodb+srv://...
FRONTEND_URL=http://localhost:3000

CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Development Commands

```bash
# Core development
npm install              # Install dependencies
npm run dev             # Start development server
npm run build           # Compile TypeScript
npm start               # Start production server

# Database operations
npm run prisma:generate # Generate Prisma client
npm run prisma:push     # Push schema to database
npm run prisma:studio   # Open Prisma Studio GUI

# Testing
curl http://localhost:3001/api/products  # Test endpoints
curl http://localhost:3001/health        # Health check
```

## Troubleshooting

### Problem: Agent not found

```
Error: "Agent 'backend-api-developer' not found"

Solution:
1. Check file exists: .claude/agents/backend-api-developer.md
2. Verify filename is correct
3. Ensure file is properly formatted markdown
4. Restart Claude Code
```

### Problem: Agent makes TypeScript errors

```
Error: Type errors after agent changes

Solution:
1. Run: npm run build
2. Check the specific error messages
3. Update agent config with TypeScript patterns
4. Re-run agent with corrected patterns
```

### Problem: Database changes fail

```
Error: Prisma client out of sync

Solution:
1. Run: npm run prisma:generate
2. Run: npm run prisma:push
3. Restart development server
4. Clear node_modules and reinstall if needed
```

### Problem: Webhook verification fails

```
Error: Invalid webhook signature

Solution:
1. Check webhook secret in .env matches service
2. Verify signature verification code
3. Test with webhook test events
4. Check service documentation for changes
```

## Testing Agents

Test each agent with these commands:

```bash
# Test API Developer Agent
"Use backend-api-developer to add health check to all routes"

# Test Database Agent
"Use backend-database-agent to analyze the Product model indexes"

# Test Admin Agent
"Use backend-admin-agent to create a revenue report endpoint"

# Test Integration Agent
"Use backend-integration-agent to verify Clerk webhook signature"
```

## Integration with GitHub Actions (Future)

Once agents are tested locally, integrate into CI/CD:

```yaml
# .github/workflows/backend-agents.yml
name: Backend Agents

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  api-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run API Developer Agent
        run: npx claude-code agent run backend-api-developer
      - name: Comment on PR
        # Post agent findings as comment
```

## Support and Resources

- **Project Root**: `/home/l910009/Desktop/saree-shop-backend/`
- **Agent Configs**: `.claude/agents/`
- **Agent Reports**: `.claude/agent-reports/`
- **Architecture**: `ARCHITECTURE.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`

## Frequently Asked Questions

**Q: Can agents work together on a single task?**
A: Yes! Claude Code orchestrates multi-agent collaboration for complex tasks.

**Q: Do agents cost extra?**
A: No additional cost beyond Claude Code subscription.

**Q: Can agents break my code?**
A: Agents can make mistakes. Always review changes before committing. Use git version control.

**Q: How do agents know my project?**
A: Through their configuration files in `.claude/agents/` which contain project-specific patterns and context.

**Q: Can I customize agents?**
A: Yes! Edit the `.md` files in `.claude/agents/` to add/modify patterns and examples.

**Q: Will agents run automatically?**
A: No. Agents only run when you or Claude Code explicitly invokes them.

**Q: Can I share agents with my team?**
A: Yes! Commit `.claude/agents/` to git so everyone has the same specialized agents.

---

## Next Steps

1. **Test an agent**: Try the backend-api-developer with a simple task
2. **Review output**: Examine the changes the agent made
3. **Refine configs**: Update agent `.md` files based on your patterns
4. **Share with team**: Commit agent configs to repository
5. **Iterate**: Improve agents as you use them

**Start with simple tasks and gradually increase complexity!**

---

**Created**: 2026-02-03
**Project**: Saree Shop Backend E-commerce API
**Status**: All 4 Agents Implemented ✅
