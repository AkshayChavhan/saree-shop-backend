import { createClerkClient, ClerkClient } from '@clerk/clerk-sdk-node';

if (!process.env.CLERK_SECRET_KEY) {
  console.warn('Warning: CLERK_SECRET_KEY is not set');
}

export const clerkClient: ClerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || '',
});

export default clerkClient;
