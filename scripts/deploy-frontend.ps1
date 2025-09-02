#!/usr/bin/env pwsh
<#
.SYNOPSIS
Deploy Frontend to Vercel - DIY Humanoid Configurator

.DESCRIPTION
Automated deployment script for the frontend to Vercel with comprehensive checks and error handling.

.PARAMETER Environment
Target environment (staging, production). Default: production

.PARAMETER SkipTests
Skip test execution before deployment. Default: false

.PARAMETER Force
Force deployment even if health checks fail. Default: false

.EXAMPLE
.\deploy-frontend.ps1
Deploy to production with all checks

.EXAMPLE
.\deploy-frontend.ps1 -Environment staging -SkipTests
Deploy to staging without running tests
#>

param(
    [ValidateSet("staging", "production")]
    [string]$Environment = "production",
    
    [switch]$SkipTests = $false,
    
    [switch]$Force = $false
)

# Script Configuration
$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Colors for output
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Progress = "Blue"
}

# Logging function
function Write-DeployLog {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = $Colors[$Level]
    
    switch ($Level) {
        "Success" { $prefix = "✅" }
        "Warning" { $prefix = "⚠️" }
        "Error" { $prefix = "❌" }
        "Progress" { $prefix = "🚀" }
        default { $prefix = "ℹ️" }
    }
    
    Write-Host "[$timestamp] $prefix $Message" -ForegroundColor $color
    
    # Log to file
    Add-Content -Path "logs/deployment-$(Get-Date -Format 'yyyy-MM-dd').log" -Value "[$timestamp] [$Level] $Message"
}

# Create logs directory if it doesn't exist
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-DeployLog "Starting Frontend Deployment to $Environment" -Level "Progress"

# Pre-deployment checks
Write-DeployLog "Running pre-deployment checks..." -Level "Info"

# Check if we're in the right directory
if (!(Test-Path "package.json") -or !(Test-Path "frontend")) {
    Write-DeployLog "Error: Not in project root directory or frontend folder missing!" -Level "Error"
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-DeployLog "Error: Node.js not found! Please install Node.js >= 20.0.0" -Level "Error"
    exit 1
}

Write-DeployLog "Node.js version: $nodeVersion" -Level "Info"

# Check Vercel CLI
try {
    $vercelVersion = vercel --version
    Write-DeployLog "Vercel CLI version: $vercelVersion" -Level "Info"
} catch {
    Write-DeployLog "Error: Vercel CLI not found! Please install: npm install -g vercel" -Level "Error"
    exit 1
}

# Install dependencies
Write-DeployLog "Installing root dependencies..." -Level "Progress"
npm install

if ($LASTEXITCODE -ne 0) {
    Write-DeployLog "Error: Failed to install root dependencies!" -Level "Error"
    exit 1
}

Write-DeployLog "Installing frontend dependencies..." -Level "Progress"
Set-Location frontend
npm ci

if ($LASTEXITCODE -ne 0) {
    Write-DeployLog "Error: Failed to install frontend dependencies!" -Level "Error"
    exit 1
}

# Run tests (unless skipped)
if (-not $SkipTests) {
    Write-DeployLog "Running frontend linting..." -Level "Progress"
    npm run lint
    
    if ($LASTEXITCODE -ne 0) {
        Write-DeployLog "Warning: Linting failed! Continuing with deployment..." -Level "Warning"
    } else {
        Write-DeployLog "Linting passed!" -Level "Success"
    }
    
    Write-DeployLog "Running frontend build test..." -Level "Progress"
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-DeployLog "Error: Build test failed!" -Level "Error"
        if (-not $Force) {
            exit 1
        } else {
            Write-DeployLog "Force flag set, continuing despite build failure..." -Level "Warning"
        }
    } else {
        Write-DeployLog "Build test passed!" -Level "Success"
    }
} else {
    Write-DeployLog "Skipping tests as requested..." -Level "Warning"
}

# Return to root directory
Set-Location ..

# Set environment-specific variables
$deployArgs = @("--prod")
$deployUrl = ""

switch ($Environment) {
    "staging" {
        $deployArgs = @()
        $deployUrl = "https://diy-humanoid-configurator-git-staging.vercel.app"
        Write-DeployLog "Deploying to Staging environment..." -Level "Progress"
    }
    "production" {
        $deployArgs = @("--prod")
        $deployUrl = "https://diy-humanoid-configurator.vercel.app"
        Write-DeployLog "Deploying to Production environment..." -Level "Progress"
    }
}

# Confirm deployment for production
if ($Environment -eq "production" -and -not $Force) {
    $confirm = Read-Host "Are you sure you want to deploy to PRODUCTION? (yes/no)"
    if ($confirm -ne "yes") {
        Write-DeployLog "Deployment cancelled by user." -Level "Warning"
        exit 0
    }
}

# Deploy to Vercel
Write-DeployLog "Starting Vercel deployment..." -Level "Progress"

$deployOutput = & vercel $deployArgs --yes 2>&1
$deployExitCode = $LASTEXITCODE

if ($deployExitCode -eq 0) {
    Write-DeployLog "Vercel deployment completed successfully!" -Level "Success"
    
    # Extract deployment URL from output if available
    foreach ($line in $deployOutput) {
        if ($line -match "https://.*\.vercel\.app") {
            $actualUrl = $matches[0]
            Write-DeployLog "Deployment URL: $actualUrl" -Level "Info"
            break
        }
    }
    
    # Wait for deployment to be ready
    Write-DeployLog "Waiting for deployment to be ready..." -Level "Progress"
    Start-Sleep -Seconds 10
    
    # Health check
    Write-DeployLog "Running post-deployment health checks..." -Level "Progress"
    
    try {
        $response = Invoke-WebRequest -Uri $deployUrl -TimeoutSec 30 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-DeployLog "Health check passed! Frontend is accessible." -Level "Success"
            
            # Check if it contains expected content
            if ($response.Content -match "DIY Humanoid Configurator") {
                Write-DeployLog "Content validation passed!" -Level "Success"
            } else {
                Write-DeployLog "Warning: Expected content not found in response." -Level "Warning"
            }
        } else {
            Write-DeployLog "Warning: Unexpected status code: $($response.StatusCode)" -Level "Warning"
        }
    } catch {
        Write-DeployLog "Warning: Health check failed: $($_.Exception.Message)" -Level "Warning"
        if (-not $Force) {
            Write-DeployLog "Consider using -Force flag if this is expected." -Level "Info"
        }
    }
    
    # Check API connectivity (if backend is available)
    if ($Environment -eq "production") {
        $apiUrl = "https://diy-humanoid-configurator-backend.railway.app/api/health"
    } else {
        $apiUrl = "https://diy-humanoid-configurator-backend-staging.railway.app/api/health"
    }
    
    try {
        Write-DeployLog "Testing API connectivity..." -Level "Progress"
        $apiResponse = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 15
        
        if ($apiResponse.status -eq "ok") {
            Write-DeployLog "API connectivity test passed!" -Level "Success"
        } else {
            Write-DeployLog "Warning: API returned unexpected status: $($apiResponse.status)" -Level "Warning"
        }
    } catch {
        Write-DeployLog "Warning: API connectivity test failed: $($_.Exception.Message)" -Level "Warning"
        Write-DeployLog "This might be expected if backend is not yet deployed." -Level "Info"
    }
    
    # Deployment summary
    Write-DeployLog "=== DEPLOYMENT SUMMARY ===" -Level "Success"
    Write-DeployLog "Environment: $Environment" -Level "Info"
    Write-DeployLog "Frontend URL: $deployUrl" -Level "Info"
    Write-DeployLog "Deployment Time: $(Get-Date)" -Level "Info"
    Write-DeployLog "Status: SUCCESS" -Level "Success"
    
    # Copy deployment URL to clipboard (Windows only)
    if ($IsWindows) {
        try {
            $deployUrl | Set-Clipboard
            Write-DeployLog "Deployment URL copied to clipboard!" -Level "Info"
        } catch {
            Write-DeployLog "Could not copy URL to clipboard." -Level "Warning"
        }
    }
    
    Write-DeployLog "🎉 Frontend deployment completed successfully!" -Level "Success"
    exit 0
    
} else {
    Write-DeployLog "Vercel deployment failed!" -Level "Error"
    Write-DeployLog "Deployment output:" -Level "Error"
    
    foreach ($line in $deployOutput) {
        Write-DeployLog $line -Level "Error"
    }
    
    # Suggest troubleshooting steps
    Write-DeployLog "=== TROUBLESHOOTING SUGGESTIONS ===" -Level "Info"
    Write-DeployLog "1. Check Vercel dashboard for detailed error logs" -Level "Info"
    Write-DeployLog "2. Verify environment variables are set correctly" -Level "Info"
    Write-DeployLog "3. Ensure build command works locally: npm run build:frontend" -Level "Info"
    Write-DeployLog "4. Check if repository is properly linked: vercel link" -Level "Info"
    Write-DeployLog "5. Try running: vercel --debug" -Level "Info"
    
    exit 1
}