# Payment Integration Guide

## Übersicht

Die DIY Humanoid Configurator Anwendung unterstützt Zahlungen über Stripe (Kreditkarten) und PayPal. Diese Dokumentation erklärt die vollständige Integration und Konfiguration.

## Features

### ✅ Implementierte Features

- **Stripe Integration**
  - Payment Intent Creation mit dynamischen Preisen
  - Secure Card Element für PCI-konforme Zahlungen
  - Webhook Handler für payment_intent.succeeded
  - Automatic Payment Methods Support
  - Refund-Prozess
  - Test Card Support

- **PayPal Integration**
  - PayPal Checkout SDK Integration
  - Order Creation und Capture
  - Webhook Handler für PAYMENT.CAPTURE.COMPLETED
  - PayPal Button Components
  - Sandbox Testing Setup

- **Frontend Components**
  - PaymentProviders Wrapper (Stripe + PayPal)
  - CheckoutForm Component mit beiden Payment-Optionen
  - PaymentMethodSelector für Methodenauswahl
  - OrderSummary für Bestellübersicht
  - CheckoutPage für kompletten Payment-Flow
  - PaymentSuccessPage für Bestätigungen

- **Backend Processing**
  - Sichere Webhook-Validierung
  - Order Status Updates nach Payment
  - Payment History Tracking
  - Error Handling und Logging
  - Admin Refund-Funktionalität

- **Security & Testing**
  - Environment-basierte Konfiguration
  - PCI-konforme Implementierung
  - Comprehensive Test Suite
  - Mock Payment Services für Development

## Installation & Setup

### 1. Dependencies installieren

```bash
# Backend
cd backend
npm install @paypal/paypal-server-sdk stripe

# Frontend  
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js @paypal/react-paypal-js
```

### 2. Automatisches Setup (Empfohlen)

```powershell
# Windows PowerShell
.\scripts\setup-payments.ps1

# Mit Optionen
.\scripts\setup-payments.ps1 -TestMode -Environment development
```

### 3. Manuelles Setup

#### Backend Environment (.env)

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"  
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret_here"

# PayPal Configuration
PAYPAL_CLIENT_ID="your_paypal_client_id_here"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret_here"
PAYPAL_ENVIRONMENT="sandbox"  # or "production"
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id_here"
```

#### Frontend Environment (.env)

```bash
# Public Keys only!
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
VITE_PAYPAL_CLIENT_ID="your_paypal_client_id_here"

# Feature Flags
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_STRIPE=true
VITE_ENABLE_PAYPAL=true
```

## API Keys erhalten

### Stripe Setup

1. Registriere dich bei [Stripe](https://dashboard.stripe.com)
2. Gehe zu **Developers > API Keys**
3. Kopiere den **Publishable Key** (pk_test_...) für Frontend
4. Kopiere den **Secret Key** (sk_test_...) für Backend
5. Erstelle einen Webhook-Endpoint:
   - URL: `https://yourdomain.com/api/payment/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Kopiere den **Webhook Secret** (whsec_...)

### PayPal Setup

1. Erstelle eine App in [PayPal Developer Console](https://developer.paypal.com)
2. Wähle **Sandbox** für Testing oder **Live** für Production
3. Kopiere **Client ID** und **Client Secret**
4. Konfiguriere Webhooks:
   - URL: `https://yourdomain.com/api/payment/paypal/webhook`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

## Integration verwenden

### Frontend Integration

#### App Setup

```jsx
// App.jsx
import PaymentProviders from './components/payment/PaymentProviders';

function App() {
  return (
    <PaymentProviders>
      <Router>
        {/* Your routes */}
      </Router>
    </PaymentProviders>
  );
}
```

#### Checkout Page verwenden

```jsx
// Route Setup
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

<Routes>
  <Route path="/checkout/:orderId" element={<CheckoutPage />} />
  <Route path="/order/:orderId/success" element={<PaymentSuccessPage />} />
</Routes>
```

#### API Calls

```javascript
import { paymentAPI } from './utils/api';

// Create Payment Intent
const paymentIntent = await paymentAPI.createPaymentIntent(orderId, 'stripe');

// Confirm Payment
const result = await paymentAPI.confirmPayment(paymentId, 'stripe');

// Get Payment Methods
const methods = await paymentAPI.getPaymentMethods();
```

### Backend Integration

#### Payment Routes

```javascript
// Neue Payment Intent erstellen
POST /api/payment/create-intent
{
  "orderId": "order-123",
  "paymentMethod": "stripe"  // oder "paypal"
}

// Payment bestätigen
POST /api/payment/confirm
{
  "paymentId": "pi_xxx",
  "paymentMethod": "stripe"
}

// Refund verarbeiten (Admin)
POST /api/payment/refund
{
  "orderId": "order-123",
  "amount": 99.99,  // Optional, full refund wenn nicht angegeben
  "reason": "Customer request"
}
```

#### Webhook Endpoints

```
POST /api/payment/stripe/webhook   - Stripe Webhooks
POST /api/payment/paypal/webhook   - PayPal Webhooks
```

## Testing

### Test Cards (Stripe)

```
Visa:              4242424242424242
Visa Debit:        4000056655665556  
Mastercard:        5555555555554444
American Express:  378282246310005
Declined:          4000000000000002
Insufficient:      4000000000009995

CVV: Beliebig (123)
Expiry: Zukunft (12/34)
```

### PayPal Sandbox

- Email: buyer@example.com
- Password: testpassword
- Oder erstelle eigene Test-Accounts in PayPal Developer Console

### Test Suite ausführen

```bash
# Backend Tests
cd backend
npm test

# Specific Payment Tests  
npm test payment.test.js

# Frontend Tests
cd frontend
npm test

# E2E Tests
npm run test:e2e
```

## Payment Flow

### 1. Order Creation
- User konfiguriert Humanoid
- Order wird erstellt mit Status `PENDING`
- PaymentStatus ist `PENDING`

### 2. Checkout Process
- User navigiert zu `/checkout/:orderId`
- CheckoutPage lädt Order-Details
- PaymentMethodSelector zeigt verfügbare Methoden

### 3. Payment Processing

#### Stripe Flow
```
1. User wählt "Credit Card"
2. Frontend erstellt Payment Intent via API
3. Stripe Elements sammelt Card-Daten sicher
4. Payment wird mit Stripe confirmiert
5. Bei Erfolg: Redirect zu Success Page
6. Webhook bestätigt Payment auf Backend
7. Order Status wird auf PROCESSING gesetzt
```

#### PayPal Flow
```
1. User wählt "PayPal"
2. Frontend erstellt PayPal Order via API
3. PayPal Button öffnet PayPal Login
4. User bestätigt Payment bei PayPal
5. Frontend captured Payment via API
6. Bei Erfolg: Redirect zu Success Page
7. Webhook bestätigt Payment auf Backend
8. Order Status wird auf PROCESSING gesetzt
```

### 4. Post-Payment
- Email-Bestätigung wird gesendet
- Manual Generation wird getriggert
- Order Status: PROCESSING → COMPLETED

## Error Handling

### Frontend Errors
```javascript
// CheckoutForm.jsx
const handlePaymentError = (error) => {
  console.error('Payment error:', error);
  setError(error.message || 'Payment failed. Please try again.');
  // User-friendly error display
};
```

### Backend Errors
```javascript
// paymentService.js
try {
  const paymentIntent = await stripe.paymentIntents.create({...});
  return paymentIntent;
} catch (error) {
  logger.error('Stripe payment failed', { error: error.message });
  throw new Error(`Stripe payment failed: ${error.message}`);
}
```

### Common Errors & Solutions

| Error | Ursache | Lösung |
|-------|---------|--------|
| "Payment method not configured" | API Keys fehlen | Environment Variables prüfen |
| "Invalid webhook signature" | Webhook Secret falsch | Stripe/PayPal Webhook Secret aktualisieren |
| "Order not found" | Order ID ungültig | Order-Erstellung prüfen |
| "Order already paid" | Doppelte Zahlung | Order Status vor Payment prüfen |
| "Insufficient funds" | Test Card | Andere Test Card verwenden |

## Security Best Practices

### ✅ Implementiert

- **Environment Variables**: Keine API Keys im Code
- **PCI Compliance**: Stripe Elements für Card-Daten
- **Webhook Validation**: Signatur-Verifizierung
- **HTTPS Only**: Verschlüsselte Übertragung
- **Error Sanitization**: Keine sensitive Daten in Logs
- **Rate Limiting**: API-Schutz vor Missbrauch

### 🔒 Zusätzliche Empfehlungen

- Regelmäßige Key-Rotation
- Monitoring von Payment-Anomalien
- Fraud Detection Integration
- 2FA für Admin-Refunds

## Monitoring & Logging

### Payment Events
```javascript
// Erfolgreiche Payments
logger.info('Payment success processed', { 
  orderId: order.id, 
  paymentId, 
  provider: 'stripe',
  amount: 99.99 
});

// Failed Payments  
logger.error('Payment failed', { 
  orderId: order.id, 
  error: error.message,
  provider: 'stripe'
});

// Refunds
logger.info('Refund processed', { 
  orderId: order.id, 
  refundId: refund.id,
  amount: 99.99 
});
```

### Webhook Events
```javascript
// Stripe Webhooks
logger.info('Stripe webhook received', { 
  eventType: event.type, 
  eventId: event.id 
});

// PayPal Webhooks
logger.info('PayPal webhook received', { 
  eventType: event.event_type, 
  id: event.id 
});
```

## Production Deployment

### Environment Setup

```bash
# Production Environment Variables
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

PAYPAL_CLIENT_ID="live_client_id"
PAYPAL_CLIENT_SECRET="live_client_secret"  
PAYPAL_ENVIRONMENT="production"
```

### Webhook URLs

```
Stripe Webhook URL: https://yourdomain.com/api/payment/stripe/webhook
PayPal Webhook URL: https://yourdomain.com/api/payment/paypal/webhook
```

### Health Checks

```bash
# Payment Provider Status (Admin)
GET /api/payment/status

Response:
{
  "stripe": {
    "enabled": true,
    "configured": true,
    "webhookConfigured": true
  },
  "paypal": {
    "enabled": true,
    "configured": true,
    "webhookConfigured": true
  }
}
```

## Troubleshooting

### Debug Mode

```bash
# Backend Debugging
DEBUG_PAYMENT=true npm run dev

# Verbose Logging
LOG_LEVEL=debug npm run dev
```

### Common Issues

1. **Webhooks nicht empfangen**
   - Überprüfe Webhook URLs
   - Teste mit ngrok für lokale Entwicklung
   - Prüfe Firewall-Einstellungen

2. **Payment Intent Creation fehlgeschlagen**
   - Validiere API Keys
   - Prüfe Stripe Dashboard für Errors
   - Überprüfe Order-Daten

3. **PayPal Orders fehlgeschlagen**
   - Prüfe PayPal Developer Console
   - Validiere Client Credentials
   - Überprüfe Sandbox vs. Production Environment

## Support & Dokumentation

- **Stripe Docs**: https://stripe.com/docs
- **PayPal Docs**: https://developer.paypal.com/docs/
- **React Stripe**: https://github.com/stripe/react-stripe-js
- **PayPal React**: https://github.com/paypal/react-paypal-js

## Changelog

### v1.0.0 (2025-01-02)
- ✅ Initial Stripe Integration
- ✅ PayPal Integration 
- ✅ Frontend Components
- ✅ Backend API Endpoints
- ✅ Webhook Handling
- ✅ Test Suite
- ✅ Documentation