-- Migration: Add Authentication System
-- Generated: 2024-09-02

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPPORT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update Users table with auth fields
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- Create refresh tokens table
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_key" ON "password_resets"("token");

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "password_resets_email_idx" ON "password_resets"("email");
CREATE INDEX IF NOT EXISTS "password_resets_expiresAt_idx" ON "password_resets"("expiresAt");

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "email_verifications_token_key" ON "email_verifications"("token");

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "email_verifications_email_idx" ON "email_verifications"("email");
CREATE INDEX IF NOT EXISTS "email_verifications_expiresAt_idx" ON "email_verifications"("expiresAt");

-- Create login attempts table
CREATE TABLE IF NOT EXISTS "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- Create indexes for rate limiting and security analysis
CREATE INDEX IF NOT EXISTS "login_attempts_email_idx" ON "login_attempts"("email");
CREATE INDEX IF NOT EXISTS "login_attempts_ipAddress_idx" ON "login_attempts"("ipAddress");
CREATE INDEX IF NOT EXISTS "login_attempts_createdAt_idx" ON "login_attempts"("createdAt");
CREATE INDEX IF NOT EXISTS "login_attempts_email_success_createdAt_idx" ON "login_attempts"("email", "success", "createdAt");

-- Add foreign key constraints
ALTER TABLE "refresh_tokens" 
ADD CONSTRAINT "refresh_tokens_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_resets" 
ADD CONSTRAINT "password_resets_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_verifications" 
ADD CONSTRAINT "email_verifications_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update config_components table to support both products and components
ALTER TABLE "config_components" 
ADD COLUMN IF NOT EXISTS "componentId" TEXT;

ALTER TABLE "config_components" 
ALTER COLUMN "productId" DROP NOT NULL;

-- Add foreign key for components relation
ALTER TABLE "config_components" 
ADD CONSTRAINT "config_components_componentId_fkey" 
FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update order_items table to support both products and components
ALTER TABLE "order_items" 
ADD COLUMN IF NOT EXISTS "componentId" TEXT;

-- Add foreign key for components relation
ALTER TABLE "order_items" 
ADD CONSTRAINT "order_items_componentId_fkey" 
FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- Insert default admin user (if not exists)
INSERT INTO "users" ("id", "email", "name", "password", "role", "emailVerified", "isActive", "createdAt", "updatedAt")
SELECT 
    'admin-' || gen_random_uuid(),
    'admin@diy-humanoid-configurator.com',
    'System Administrator',
    '$2b$12$LQv3c1yqBwEsj.RNdvNSFeR2bJlQOxVCBqf1A6W8B2y1N6xnTz6mq', -- Default: "admin123" - CHANGE IN PRODUCTION!
    'ADMIN'::"Role",
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "users" WHERE "email" = 'admin@diy-humanoid-configurator.com'
);

-- Create a view for user security info (for admin dashboard)
CREATE OR REPLACE VIEW "user_security_view" AS
SELECT 
    u."id",
    u."email",
    u."name",
    u."role",
    u."emailVerified",
    u."isActive",
    u."loginAttempts",
    u."lockedUntil",
    u."lastLogin",
    u."createdAt",
    (SELECT COUNT(*) FROM "refresh_tokens" rt WHERE rt."userId" = u."id" AND rt."isRevoked" = false AND rt."expiresAt" > CURRENT_TIMESTAMP) as "activeTokens",
    (SELECT COUNT(*) FROM "login_attempts" la WHERE la."email" = u."email" AND la."success" = false AND la."createdAt" > CURRENT_TIMESTAMP - INTERVAL '24 hours') as "recentFailedLogins"
FROM "users" u;

-- Create function to cleanup expired tokens (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens() 
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete expired refresh tokens
    DELETE FROM "refresh_tokens" 
    WHERE "expiresAt" < CURRENT_TIMESTAMP OR "isRevoked" = true;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired password reset tokens
    DELETE FROM "password_resets" 
    WHERE "expiresAt" < CURRENT_TIMESTAMP OR "used" = true;
    
    -- Delete expired email verification tokens
    DELETE FROM "email_verifications" 
    WHERE "expiresAt" < CURRENT_TIMESTAMP OR "used" = true;
    
    -- Delete old login attempts (older than 30 days)
    DELETE FROM "login_attempts" 
    WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust as needed for your database setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;