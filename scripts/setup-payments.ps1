# =============================================================================
# Payment Integration Setup Script
# =============================================================================
# Dieses Script hilft beim Setup der Stripe und PayPal Integration

param(
    [switch]$TestMode = $true,
    [switch]$SkipDependencies = $false,
    [string]$Environment = "development"
)

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "DIY Humanoid Configurator - Payment Integration Setup" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

# Check if running in correct directory
if (!(Test-Path "package.json")) {
    Write-Error "Dieses Script muss im Projekt-Root-Verzeichnis ausgeführt werden!"
    exit 1
}

# Function to check if command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Host "1. Überprüfe Voraussetzungen..." -ForegroundColor Yellow

if (!(Test-Command "node")) {
    Write-Error "Node.js ist nicht installiert. Bitte installiere Node.js >= 20.0.0"
    exit 1
}

if (!(Test-Command "npm")) {
    Write-Error "npm ist nicht installiert. Bitte installiere npm >= 10.0.0"
    exit 1
}

$nodeVersion = (node --version).Replace('v', '')
if ([Version]$nodeVersion -lt [Version]"20.0.0") {
    Write-Error "Node.js Version $nodeVersion ist zu alt. Benötigt wird >= 20.0.0"
    exit 1
}

Write-Host "✓ Node.js Version: $nodeVersion" -ForegroundColor Green

# Install dependencies if not skipped
if (!$SkipDependencies) {
    Write-Host "`n2. Installiere Dependencies..." -ForegroundColor Yellow
    
    # Backend dependencies
    Write-Host "Installing Backend Dependencies..." -ForegroundColor Cyan
    Set-Location "backend"
    
    # Check if PayPal SDK is installed
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if (!$packageJson.dependencies."@paypal/paypal-server-sdk") {
        Write-Host "Installiere PayPal SDK..." -ForegroundColor Cyan
        npm install @paypal/paypal-server-sdk
    }
    
    # Ensure Stripe is installed
    if (!$packageJson.dependencies."stripe") {
        Write-Host "Installiere Stripe SDK..." -ForegroundColor Cyan
        npm install stripe
    }
    
    Set-Location ".."
    
    # Frontend dependencies
    Write-Host "Installing Frontend Dependencies..." -ForegroundColor Cyan
    Set-Location "frontend"
    
    $frontendPackageJson = Get-Content "package.json" | ConvertFrom-Json
    $needsInstall = $false
    
    if (!$frontendPackageJson.dependencies."@stripe/stripe-js") {
        Write-Host "Installiere Stripe Frontend SDK..." -ForegroundColor Cyan
        npm install @stripe/stripe-js @stripe/react-stripe-js
        $needsInstall = $true
    }
    
    if (!$frontendPackageJson.dependencies."@paypal/react-paypal-js") {
        Write-Host "Installiere PayPal Frontend SDK..." -ForegroundColor Cyan
        npm install @paypal/react-paypal-js
        $needsInstall = $true
    }
    
    Set-Location ".."
    Write-Host "✓ Dependencies installiert" -ForegroundColor Green
} else {
    Write-Host "2. Dependency Installation übersprungen" -ForegroundColor Yellow
}

# Setup environment variables
Write-Host "`n3. Environment Variables Setup..." -ForegroundColor Yellow

$backendEnvPath = "backend\.env"
$frontendEnvPath = "frontend\.env"

# Check for existing .env files
$backendEnvExists = Test-Path $backendEnvPath
$frontendEnvExists = Test-Path $frontendEnvPath

if (!$backendEnvExists) {
    Write-Host "Erstelle Backend .env Datei..." -ForegroundColor Cyan
    Copy-Item "backend\.env.example" $backendEnvPath
    Write-Host "✓ Backend .env erstellt aus .env.example" -ForegroundColor Green
} else {
    Write-Host "Backend .env existiert bereits" -ForegroundColor Gray
}

# Create frontend .env if needed
if (!$frontendEnvExists) {
    Write-Host "Erstelle Frontend .env Datei..." -ForegroundColor Cyan
    
    $frontendEnvContent = @"
# Frontend Environment Variables
VITE_API_URL=http://localhost:3001/api
VITE_APP_ENV=$Environment

# Payment Configuration (Public Keys only!)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here

# Feature Flags
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_STRIPE=true
VITE_ENABLE_PAYPAL=true

# Currency Settings
VITE_DEFAULT_CURRENCY=EUR
"@
    
    $frontendEnvContent | Out-File -FilePath $frontendEnvPath -Encoding utf8
    Write-Host "✓ Frontend .env erstellt" -ForegroundColor Green
} else {
    Write-Host "Frontend .env existiert bereits" -ForegroundColor Gray
}

# Environment Variable Validation
Write-Host "`n4. Validiere Environment Variables..." -ForegroundColor Yellow

$backendEnv = Get-Content $backendEnvPath
$missingVars = @()

$requiredVars = @(
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY", 
    "STRIPE_WEBHOOK_SECRET",
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET"
)

foreach ($var in $requiredVars) {
    $found = $backendEnv | Where-Object { $_ -match "^$var=" -and $_ -notmatch "your_.*_here" }
    if (!$found) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "⚠️  Folgende Environment Variables müssen noch konfiguriert werden:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Bitte bearbeite die .env Dateien und trage echte API-Keys ein." -ForegroundColor Yellow
} else {
    Write-Host "✓ Alle Payment Environment Variables sind konfiguriert" -ForegroundColor Green
}

# Create logs directory
Write-Host "`n5. Setup Logging..." -ForegroundColor Yellow

$logsDir = "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "✓ Logs Verzeichnis erstellt" -ForegroundColor Green
} else {
    Write-Host "Logs Verzeichnis existiert bereits" -ForegroundColor Gray
}

# Test Mode Setup
if ($TestMode) {
    Write-Host "`n6. Setup Test Mode..." -ForegroundColor Yellow
    
    # Create test data
    $testDataScript = @"
// Test Payment Data
export const testPaymentData = {
  testOrder: {
    id: 'test-order-001',
    totalPrice: 99.99,
    currency: 'EUR',
    items: [
      {
        name: 'DIY Humanoid Basic Kit',
        quantity: 1,
        price: 99.99,
        description: 'Complete basic humanoid robot kit for testing'
      }
    ]
  },
  
  stripeTestCards: {
    visa: '4242424242424242',
    visaDebit: '4000056655665556',
    mastercard: '5555555555554444',
    amex: '378282246310005',
    decline: '4000000000000002',
    insufficientFunds: '4000000000009995'
  },
  
  paypalTestAccount: {
    email: 'buyer@example.com',
    password: 'testpassword'
  }
};
"@
    
    $testDataPath = "frontend\src\utils\testData.js"
    $testDataScript | Out-File -FilePath $testDataPath -Encoding utf8
    Write-Host "✓ Test-Daten erstellt: $testDataPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Test-Kreditkarten für Stripe:" -ForegroundColor Cyan
    Write-Host "  Visa:              4242424242424242" -ForegroundColor White
    Write-Host "  Visa Debit:        4000056655665556" -ForegroundColor White
    Write-Host "  Mastercard:        5555555555554444" -ForegroundColor White
    Write-Host "  American Express:  378282246310005" -ForegroundColor White
    Write-Host "  Decline:           4000000000000002" -ForegroundColor White
    Write-Host "  CVV: Beliebig (z.B. 123), Ablauf: Zukunft (z.B. 12/34)" -ForegroundColor Gray
}

# Security Check
Write-Host "`n7. Sicherheits-Check..." -ForegroundColor Yellow

# Check if .env files are in .gitignore
$gitignorePath = ".gitignore"
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath
    if ($gitignoreContent -notcontains "*.env" -and $gitignoreContent -notcontains ".env") {
        Write-Host "⚠️  .env Dateien sind NICHT in .gitignore!" -ForegroundColor Red
        Write-Host "   Füge '*.env' zur .gitignore hinzu um API-Keys zu schützen!" -ForegroundColor Red
    } else {
        Write-Host "✓ .env Dateien sind in .gitignore geschützt" -ForegroundColor Green
    }
}

# Check file permissions
try {
    $acl = Get-Acl $backendEnvPath
    Write-Host "✓ .env Datei-Berechtigungen geprüft" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Konnte .env Datei-Berechtigungen nicht prüfen" -ForegroundColor Yellow
}

# Final Instructions
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "Setup Abgeschlossen!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Nächste Schritte:" -ForegroundColor Cyan
Write-Host "1. Bearbeite backend\.env und frontend\.env mit echten API-Keys" -ForegroundColor White
Write-Host "2. Starte den Backend-Server: cd backend && npm run dev" -ForegroundColor White  
Write-Host "3. Starte den Frontend-Server: cd frontend && npm run dev" -ForegroundColor White
Write-Host "4. Teste Payments unter http://localhost:5173" -ForegroundColor White
Write-Host ""

Write-Host "API-Keys erhalten:" -ForegroundColor Cyan
Write-Host "• Stripe: https://dashboard.stripe.com/test/apikeys" -ForegroundColor White
Write-Host "• PayPal: https://developer.paypal.com/api/rest/" -ForegroundColor White
Write-Host ""

Write-Host "Webhooks konfigurieren:" -ForegroundColor Cyan
Write-Host "• Stripe Webhook URL: http://localhost:3001/api/payment/stripe/webhook" -ForegroundColor White
Write-Host "• PayPal Webhook URL: http://localhost:3001/api/payment/paypal/webhook" -ForegroundColor White
Write-Host ""

if ($missingVars.Count -gt 0) {
    Write-Host "⚠️  WICHTIG: Payment-Keys müssen noch konfiguriert werden!" -ForegroundColor Yellow
    Write-Host "   Payments werden erst nach der Konfiguration funktionieren." -ForegroundColor Yellow
} else {
    Write-Host "✅ Payment-Integration ist bereit für Tests!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Für Hilfe: README.md oder PAYMENT_SETUP_GUIDE.md" -ForegroundColor Gray