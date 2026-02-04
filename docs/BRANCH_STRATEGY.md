# Branch Strategy - Backend (saree-shop-backend)

## Repository
- **URL:** https://github.com/AkshayChavhan/saree-shop-backend.git
- **Deployment:** Google Cloud Platform (App Engine)

---

## Branch Overview

| Branch | Purpose | Deployed |
|--------|---------|----------|
| `prod` | Production branch | Yes (GCP App Engine) |
| `master` | Staging/Pre-production | No |
| `dev` | Development/Testing | No |
| `backend-bug-fixer` | Bug fixes and patches | No |
| `gcp-vm-setup` | Infrastructure: GCP setup | No |

---

## Merge Flow

```
feature-branch → dev → master → prod → GCP (Production)
```

### Workflow

1. **Create feature branch** from `dev`
2. **Develop and test** on feature branch
3. **Merge to `dev`** for integration testing
4. **Merge `dev` to `master`** for staging/QA
5. **Merge `master` to `prod`** for production deployment
6. **Deploy to GCP** from `prod` branch

---

## Branch Descriptions

### `prod` (Production)
- **Status:** Protected, deployed to GCP App Engine
- **Purpose:** Production-ready code only
- **Deployment URL:** https://saree-shop-backend.appspot.com/

### `master` (Staging)
- **Status:** Pre-production branch
- **Purpose:** Final testing before production
- **Merges into:** `prod`

### `dev` (Development)
- **Status:** Integration branch
- **Purpose:** Integration testing of features
- **Merges into:** `master`

### `backend-bug-fixer` (Development)
- **Status:** Active development branch
- **Purpose:** Bug fixes and patches
- **Merges into:** `dev`

### `gcp-vm-setup` (Infrastructure)
- **Status:** Infrastructure setup
- **Purpose:** GCP configuration
- **Merges into:** `dev`

---

## Rules

1. Never push directly to `prod`, `master`, or `dev`
2. Always create PR for merging
3. Run `npm run build` before merging
4. Run `npm run lint` before merging
5. Test API endpoints before merging to `prod`
6. Verify GCP deployment after merge to `prod`

---

## Environment Mapping

| Branch | Environment | URL |
|--------|-------------|-----|
| `prod` | Production | https://saree-shop-backend.appspot.com/ |
| `master` | Staging | - |
| `dev` | Development | localhost:3000 |

---

## Quick Commands

```bash
# Switch to dev
git checkout dev

# Create new feature branch from dev
git checkout -b feature/your-feature-name

# Update from dev
git pull origin dev

# Push feature branch
git push -u origin feature/your-feature-name

# Merge flow (after PR approval)
git checkout dev && git merge feature-branch
git checkout master && git merge dev
git checkout prod && git merge master
```

---

## Deployment Commands

```bash
# Deploy to GCP App Engine (from prod branch)
git checkout prod
gcloud app deploy
```

---

*Last updated: February 2026*
