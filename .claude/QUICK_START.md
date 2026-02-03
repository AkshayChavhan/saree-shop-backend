# Quick Start - Backend Agents

## Using Custom Agents

Simply ask Claude Code to use an agent in your conversation:

### Backend API Developer
```
"Use the backend-api-developer agent to create a GET /api/reviews endpoint"
```

### Backend Database Agent
```
"Use the backend-database-agent to add a Coupon model to the schema"
```

### Backend Admin Agent
```
"Use the backend-admin-agent to create a sales report endpoint"
```

### Backend Integration Agent
```
"Use the backend-integration-agent to implement Stripe payment webhooks"
```

## Quick Test Commands

Try these to test each agent:

```bash
# Test API Developer
"Use backend-api-developer to analyze the products route structure"

# Test Database Agent
"Use backend-database-agent to check which models have indexes"

# Test Admin Agent
"Use backend-admin-agent to check the dashboard stats implementation"

# Test Integration Agent
"Use backend-integration-agent to verify Clerk webhook signature logic"
```

## Common Tasks

### Create New Endpoint
```
"Use backend-api-developer to add GET /api/products/trending endpoint"
```

### Add Database Model
```
"Use backend-database-agent to add a Newsletter model with email field"
```

### Build Admin Feature
```
"Use backend-admin-agent to add low stock alerts to dashboard"
```

### Integrate Service
```
"Use backend-integration-agent to add Twilio SMS notifications"
```

## After Agent Completes

1. **Review changes** - Check the files modified
2. **Run build** - `npm run build`
3. **Test locally** - `npm run dev`
4. **Generate Prisma** (if schema changed) - `npm run prisma:generate`
5. **Commit** - When satisfied with changes

## Need Help?

See [BACKEND_AGENTS_README.md](./BACKEND_AGENTS_README.md) for comprehensive documentation.
