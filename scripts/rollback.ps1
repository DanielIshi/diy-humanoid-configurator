#!/usr/bin/env pwsh
<#
.SYNOPSIS
Rollback Deployment - DIY Humanoid Configurator

.DESCRIPTION
Emergency rollback script for both frontend (Vercel) and backend (Railway) deployments.

.PARAMETER Service
Target service to rollback (frontend, backend, both). Default: both

.PARAMETER Environment
Target environment (staging, production). Default: production

.PARAMETER Force
Force rollback without confirmation. Default: false

.EXAMPLE
.\rollback.ps1
Rollback both services in production

.EXAMPLE
.\rollback.ps1 -Service backend -Force
Rollback only backend without confirmation
#>

param(
    [ValidateSet("frontend", "backend", "both")]
    [string]$Service = "both",
    
    [ValidateSet("staging", "production")]
    [string]$Environment = "production",
    
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
    Critical = "Magenta"
}

# Logging function
function Write-RollbackLog {
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
        "Progress" { $prefix = "🔄" }
        "Critical" { $prefix = "🚨" }
        default { $prefix = "ℹ️" }
    }
    
    Write-Host "[$timestamp] $prefix $Message" -ForegroundColor $color
    
    # Log to file
    Add-Content -Path "logs/rollback-$(Get-Date -Format 'yyyy-MM-dd').log" -Value "[$timestamp] [$Level] $Message"
}

# Create logs directory if it doesn't exist
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-RollbackLog "=== EMERGENCY ROLLBACK INITIATED ===" -Level "Critical"
Write-RollbackLog "Service: $Service | Environment: $Environment" -Level "Info"

# Confirmation for production rollbacks
if ($Environment -eq "production" -and -not $Force) {
    Write-RollbackLog "⚠️ PRODUCTION ROLLBACK REQUESTED ⚠️" -Level "Critical"
    Write-Host ""
    Write-Host "This will rollback production services to their previous version!" -ForegroundColor Red
    Write-Host "Service: $Service" -ForegroundColor Yellow
    Write-Host "Environment: $Environment" -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Type 'ROLLBACK' to confirm production rollback"
    if ($confirm -ne "ROLLBACK") {
        Write-RollbackLog "Rollback cancelled by user." -Level "Warning"
        exit 0
    }
}

# Pre-rollback checks
Write-RollbackLog "Running pre-rollback checks..." -Level "Progress"

# Check required tools
$toolsOk = $true

if ($Service -in @("frontend", "both")) {
    try {
        $vercelVersion = vercel --version
        Write-RollbackLog "Vercel CLI available: $vercelVersion" -Level "Info"
    } catch {
        Write-RollbackLog "Error: Vercel CLI not found!" -Level "Error"
        $toolsOk = $false
    }
}

if ($Service -in @("backend", "both")) {
    try {
        $railwayVersion = railway version
        Write-RollbackLog "Railway CLI available: $railwayVersion" -Level "Info"
    } catch {
        Write-RollbackLog "Error: Railway CLI not found!" -Level "Error"
        $toolsOk = $false
    }
}

if (-not $toolsOk) {
    Write-RollbackLog "Missing required tools. Aborting rollback." -Level "Error"
    exit 1
}

# Function to rollback frontend
function Invoke-FrontendRollback {
    Write-RollbackLog "Starting Frontend Rollback..." -Level "Progress"
    
    try {
        # Get current deployment info
        Write-RollbackLog "Fetching current deployment information..." -Level "Info"
        $deployments = vercel ls --json | ConvertFrom-Json
        
        if ($deployments.Count -lt 2) {
            Write-RollbackLog "Error: No previous deployment found to rollback to!" -Level "Error"
            return $false
        }
        
        # Get the previous deployment (second in list)
        $previousDeployment = $deployments[1]
        Write-RollbackLog "Previous deployment: $($previousDeployment.url) ($(Get-Date $previousDeployment.created))" -Level "Info"
        
        # Perform rollback
        Write-RollbackLog "Rolling back to previous deployment..." -Level "Progress"
        
        if ($Environment -eq "production") {
            # For production, promote the previous deployment
            vercel promote $previousDeployment.url --yes
        } else {
            # For staging, redeploy the previous version
            vercel --target staging --yes
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-RollbackLog "Frontend rollback completed successfully!" -Level "Success"
            
            # Verify rollback
            Start-Sleep -Seconds 10
            $frontendUrl = if ($Environment -eq "production") {
                "https://diy-humanoid-configurator.vercel.app"
            } else {
                "https://diy-humanoid-configurator-git-staging.vercel.app"
            }
            
            try {
                $response = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 30 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-RollbackLog "Frontend health check passed after rollback!" -Level "Success"
                } else {
                    Write-RollbackLog "Warning: Frontend health check returned status $($response.StatusCode)" -Level "Warning"
                }
            } catch {
                Write-RollbackLog "Warning: Frontend health check failed: $($_.Exception.Message)" -Level "Warning"
            }
            
            return $true
        } else {
            Write-RollbackLog "Frontend rollback failed!" -Level "Error"
            return $false
        }
        
    } catch {
        Write-RollbackLog "Frontend rollback error: $($_.Exception.Message)" -Level "Error"
        return $false
    }
}

# Function to rollback backend
function Invoke-BackendRollback {
    Write-RollbackLog "Starting Backend Rollback..." -Level "Progress"
    
    try {
        # Check Railway authentication
        railway whoami | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-RollbackLog "Error: Not authenticated with Railway!" -Level "Error"
            return $false
        }
        
        # Get deployment history
        Write-RollbackLog "Fetching deployment history..." -Level "Info"
        
        # Railway rollback command
        Write-RollbackLog "Executing Railway rollback..." -Level "Progress"
        railway rollback --service backend
        
        if ($LASTEXITCODE -eq 0) {
            Write-RollbackLog "Backend rollback command completed!" -Level "Success"
            
            # Wait for rollback to take effect
            Write-RollbackLog "Waiting for rollback to take effect..." -Level "Progress"
            Start-Sleep -Seconds 30
            
            # Verify rollback with health check
            $backendUrl = if ($Environment -eq "production") {
                "https://diy-humanoid-configurator-backend.railway.app"
            } else {
                "https://diy-humanoid-configurator-backend-staging.railway.app"
            }
            
            $healthCheckPassed = $false
            $maxRetries = 5
            $retryCount = 0
            
            while (-not $healthCheckPassed -and $retryCount -lt $maxRetries) {
                try {
                    $retryCount++
                    Write-RollbackLog "Health check attempt $retryCount/$maxRetries..." -Level "Progress"
                    
                    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/health" -TimeoutSec 30
                    
                    if ($healthResponse.status -eq "ok") {
                        Write-RollbackLog "Backend health check passed after rollback!" -Level "Success"
                        $healthCheckPassed = $true
                    }
                } catch {
                    Write-RollbackLog "Health check attempt $retryCount failed: $($_.Exception.Message)" -Level "Warning"
                    if ($retryCount -lt $maxRetries) {
                        Start-Sleep -Seconds 10
                    }
                }
            }
            
            if (-not $healthCheckPassed) {
                Write-RollbackLog "Warning: Backend health check failed after rollback!" -Level "Warning"
                Write-RollbackLog "Manual investigation may be required." -Level "Warning"
            }
            
            return $true
        } else {
            Write-RollbackLog "Backend rollback command failed!" -Level "Error"
            return $false
        }
        
    } catch {
        Write-RollbackLog "Backend rollback error: $($_.Exception.Message)" -Level "Error"
        return $false
    }
}

# Execute rollbacks based on service selection
$rollbackResults = @{
    Frontend = $null
    Backend = $null
}

switch ($Service) {
    "frontend" {
        $rollbackResults.Frontend = Invoke-FrontendRollback
    }
    "backend" {
        $rollbackResults.Backend = Invoke-BackendRollback
    }
    "both" {
        Write-RollbackLog "Rolling back both services..." -Level "Progress"
        
        # Rollback backend first (more critical)
        $rollbackResults.Backend = Invoke-BackendRollback
        
        if ($rollbackResults.Backend) {
            Write-RollbackLog "Backend rollback successful, proceeding with frontend..." -Level "Success"
            $rollbackResults.Frontend = Invoke-FrontendRollback
        } else {
            Write-RollbackLog "Backend rollback failed! Continuing with frontend rollback..." -Level "Warning"
            $rollbackResults.Frontend = Invoke-FrontendRollback
        }
    }
}

# Rollback summary
Write-RollbackLog "=== ROLLBACK SUMMARY ===" -Level "Critical"
Write-RollbackLog "Environment: $Environment" -Level "Info"
Write-RollbackLog "Service: $Service" -Level "Info"
Write-RollbackLog "Timestamp: $(Get-Date)" -Level "Info"

$overallSuccess = $true

if ($rollbackResults.Frontend -ne $null) {
    $status = if ($rollbackResults.Frontend) { "SUCCESS" } else { "FAILED" }
    $level = if ($rollbackResults.Frontend) { "Success" } else { "Error" }
    Write-RollbackLog "Frontend Rollback: $status" -Level $level
    if (-not $rollbackResults.Frontend) { $overallSuccess = $false }
}

if ($rollbackResults.Backend -ne $null) {
    $status = if ($rollbackResults.Backend) { "SUCCESS" } else { "FAILED" }
    $level = if ($rollbackResults.Backend) { "Success" } else { "Error" }
    Write-RollbackLog "Backend Rollback: $status" -Level $level
    if (-not $rollbackResults.Backend) { $overallSuccess = $false }
}

if ($overallSuccess) {
    Write-RollbackLog "🎉 Rollback completed successfully!" -Level "Success"
    
    # Post-rollback recommendations
    Write-RollbackLog "=== POST-ROLLBACK RECOMMENDATIONS ===" -Level "Info"
    Write-RollbackLog "1. Monitor application logs for any issues" -Level "Info"
    Write-RollbackLog "2. Verify all critical functionality is working" -Level "Info"
    Write-RollbackLog "3. Communicate rollback status to stakeholders" -Level "Info"
    Write-RollbackLog "4. Investigate root cause of original deployment issue" -Level "Info"
    Write-RollbackLog "5. Plan fix and re-deployment strategy" -Level "Info"
    
    # Show monitoring commands
    Write-RollbackLog "=== MONITORING COMMANDS ===" -Level "Info"
    if ($Service -in @("frontend", "both")) {
        Write-RollbackLog "Frontend: https://$(if($Environment -eq 'production'){'diy-humanoid-configurator.vercel.app'}else{'diy-humanoid-configurator-git-staging.vercel.app'})" -Level "Info"
    }
    if ($Service -in @("backend", "both")) {
        Write-RollbackLog "Backend Logs: railway logs --service backend" -Level "Info"
        Write-RollbackLog "Backend Health: curl https://$(if($Environment -eq 'production'){'diy-humanoid-configurator-backend.railway.app'}else{'diy-humanoid-configurator-backend-staging.railway.app'})/api/health" -Level "Info"
    }
    
    exit 0
} else {
    Write-RollbackLog "❌ Rollback completed with errors!" -Level "Error"
    
    # Troubleshooting suggestions
    Write-RollbackLog "=== TROUBLESHOOTING SUGGESTIONS ===" -Level "Info"
    Write-RollbackLog "1. Check deployment platforms directly (Vercel/Railway dashboards)" -Level "Info"
    Write-RollbackLog "2. Verify CLI authentication: vercel whoami, railway whoami" -Level "Info"
    Write-RollbackLog "3. Check service status manually in dashboards" -Level "Info"
    Write-RollbackLog "4. Consider manual rollback through web interfaces" -Level "Info"
    Write-RollbackLog "5. Contact platform support if needed" -Level "Info"
    
    exit 1
}