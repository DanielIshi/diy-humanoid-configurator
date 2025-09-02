# API Dokumentation - DIY Humanoid Configurator

## Übersicht

Die API des DIY Humanoid Configurators bietet RESTful Endpoints für die Verwaltung von Komponenten, Konfigurationen, Bestellungen und KI-Services.

### Basis-URLs
- **Development**: `http://localhost:3001/api`
- **Production**: `https://diy-humanoid-configurator-backend.railway.app/api`

### Authentifizierung
Die API verwendet JWT (JSON Web Tokens) für die Authentifizierung. Tokens werden über den `Authorization` Header gesendet:
```
Authorization: Bearer <jwt_token>
```

### Standard Response Format
Alle API-Antworten folgen diesem einheitlichen Format:

```json
{
  "success": true|false,
  "data": {...},
  "message": "Beschreibung des Ergebnisses",
  "error": "Fehlermeldung (nur bei success: false)",
  "code": "ERROR_CODE (nur bei Fehlern)",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### HTTP Status Codes
- `200` - OK (Erfolgreiche Anfrage)
- `201` - Created (Ressource erstellt)
- `400` - Bad Request (Ungültige Anfrage)
- `401` - Unauthorized (Nicht authentifiziert)
- `403` - Forbidden (Nicht autorisiert)
- `404` - Not Found (Ressource nicht gefunden)
- `422` - Unprocessable Entity (Validierungsfehler)
- `429` - Too Many Requests (Rate Limit erreicht)
- `500` - Internal Server Error (Server-Fehler)

---

## Health & Status

### GET /api/health
Überprüft den Status der API und der Datenbankverbindung.

**Antwort:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "version": "0.7.0",
    "database": "connected",
    "uptime": 3600
  }
}
```

---

## Authentifizierung

### POST /api/auth/register
Registriert einen neuen Benutzer.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Max Mustermann",
  "role": "user"
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Max Mustermann",
      "role": "user",
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/login
Authentifiziert einen Benutzer und gibt ein JWT-Token zurück.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Max Mustermann",
      "role": "user"
    },
    "token": "jwt_token_here",
    "expiresIn": "7d"
  }
}
```

### POST /api/auth/refresh
Erneuert ein JWT-Token.

**Headers:**
```
Authorization: Bearer <current_token>
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_here",
    "expiresIn": "7d"
  }
}
```

---

## Komponenten

### GET /api/components
Gibt alle verfügbaren Komponenten zurück.

**Query Parameter:**
- `category` (optional) - Filtert nach Kategorie
- `type` (optional) - Filtert nach Komponententyp
- `page` (optional, default: 1) - Seitenzahl
- `limit` (optional, default: 20) - Anzahl pro Seite
- `search` (optional) - Suchbegriff

**Beispiel-Request:**
```
GET /api/components?category=servos&search=mg90s&page=1&limit=10
```

**Antwort:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "MG90S Servo Motor",
      "description": "9g Micro Servo mit Metallgetriebe",
      "category": "servos",
      "type": "micro_servo",
      "specifications": {
        "weight": "13.4g",
        "dimensions": "23x12.2x29mm",
        "torque": "2.5kg/cm",
        "speed": "0.1s/60°",
        "voltage": "4.8-6V",
        "current": "220mA"
      },
      "pricing": {
        "purchase_price": 8.50,
        "selling_price": 12.99,
        "margin_percent": 52.8,
        "currency": "EUR"
      },
      "availability": {
        "in_stock": true,
        "stock_count": 150,
        "supplier": "Robotshop",
        "lead_time_days": 3
      },
      "compatibility": ["arduino", "raspberry_pi", "esp32"],
      "tags": ["micro", "metal_gear", "budget"],
      "image_url": "/images/components/mg90s-servo.jpg",
      "datasheet_url": "/datasheets/mg90s-datasheet.pdf",
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### GET /api/components/:id
Gibt Details zu einer spezifischen Komponente zurück.

**Antwort:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "MG90S Servo Motor",
    // ... weitere Details wie oben
    "reviews": {
      "average_rating": 4.2,
      "total_reviews": 35,
      "recent_reviews": [
        {
          "rating": 5,
          "comment": "Sehr gute Qualität für den Preis",
          "user": "TechBuilder",
          "date": "2024-01-01T12:00:00.000Z"
        }
      ]
    },
    "alternatives": [
      {
        "id": "uuid",
        "name": "SG90 Servo Motor",
        "price_difference": -3.50,
        "reason": "Günstigere Alternative ohne Metallgetriebe"
      }
    ]
  }
}
```

### POST /api/components
Erstellt eine neue Komponente (nur Admin).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "MG996R Servo Motor",
  "description": "Hochdrehmoment Servo für größere Anwendungen",
  "category": "servos",
  "type": "standard_servo",
  "specifications": {
    "weight": "55g",
    "torque": "11kg/cm",
    "voltage": "4.8-7.2V"
  },
  "pricing": {
    "purchase_price": 15.99,
    "margin_percent": 45
  },
  "availability": {
    "in_stock": true,
    "stock_count": 50,
    "supplier": "Conrad"
  }
}
```

### PUT /api/components/:id
Aktualisiert eine Komponente (nur Admin).

**Authentication:** Required (Admin)

### DELETE /api/components/:id
Löscht eine Komponente (nur Admin).

**Authentication:** Required (Admin)

---

## Konfigurationen

### GET /api/configurations
Gibt die Konfigurationen des authentifizierten Benutzers zurück.

**Authentication:** Required

**Query Parameter:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `public` (optional) - Zeigt nur öffentliche Konfigurationen

**Antwort:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mein Walking Bot",
      "description": "Einfacher zweibeiniger Roboter für Anfänger",
      "type": "walker",
      "components": [
        {
          "component_id": "uuid",
          "component": {
            "name": "MG90S Servo Motor",
            "category": "servos"
          },
          "quantity": 12,
          "position": "leg_joints",
          "custom_margin": 40.0
        }
      ],
      "total_cost": {
        "purchase_total": 234.50,
        "selling_total": 389.99,
        "total_margin": 155.49,
        "margin_percent": 41.2
      },
      "metadata": {
        "difficulty": "intermediate",
        "estimated_build_time": "4-6 hours",
        "required_tools": ["screwdriver", "pliers", "soldering_iron"]
      },
      "is_public": false,
      "is_template": false,
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### POST /api/configurations
Erstellt eine neue Konfiguration.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Mein Greifarm",
  "description": "Roboterarm mit 6 DOF",
  "type": "arm",
  "components": [
    {
      "component_id": "uuid",
      "quantity": 6,
      "position": "joints",
      "custom_margin": 35.0
    }
  ],
  "is_public": false
}
```

### GET /api/configurations/:id
Gibt eine spezifische Konfiguration zurück.

### PUT /api/configurations/:id
Aktualisiert eine Konfiguration (nur eigene oder Admin).

### DELETE /api/configurations/:id
Löscht eine Konfiguration (nur eigene oder Admin).

---

## Bestellungen

### GET /api/orders
Gibt Bestellungen zurück.

**Authentication:** Required
- Benutzer sehen nur ihre eigenen Bestellungen
- Admins sehen alle Bestellungen

**Query Parameter:**
- `status` (optional) - Filtert nach Status
- `page`, `limit` - Paginierung
- `from_date`, `to_date` - Datumsbereich

**Antwort:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001",
      "status": "confirmed",
      "user": {
        "id": "uuid",
        "name": "Max Mustermann",
        "email": "max@example.com"
      },
      "configuration": {
        "id": "uuid",
        "name": "Walking Bot v1"
      },
      "items": [
        {
          "component_id": "uuid",
          "component_name": "MG90S Servo Motor",
          "quantity": 12,
          "unit_price": 12.99,
          "total_price": 155.88
        }
      ],
      "totals": {
        "subtotal": 234.50,
        "tax": 44.56,
        "shipping": 15.90,
        "total": 294.96,
        "currency": "EUR"
      },
      "payment": {
        "method": "stripe",
        "status": "paid",
        "transaction_id": "pi_1234567890",
        "paid_at": "2024-01-01T12:30:00.000Z"
      },
      "shipping": {
        "address": {
          "name": "Max Mustermann",
          "street": "Musterstraße 123",
          "city": "München",
          "postal_code": "80333",
          "country": "DE"
        },
        "method": "standard",
        "tracking_number": "DHL1234567890",
        "estimated_delivery": "2024-01-05T12:00:00.000Z"
      },
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T13:00:00.000Z"
    }
  ]
}
```

### POST /api/orders
Erstellt eine neue Bestellung.

**Authentication:** Required

**Request Body:**
```json
{
  "configuration_id": "uuid",
  "shipping_address": {
    "name": "Max Mustermann",
    "street": "Musterstraße 123",
    "city": "München",
    "postal_code": "80333",
    "country": "DE"
  },
  "payment_method": "stripe",
  "notes": "Bitte vorsichtig verpacken"
}
```

### PUT /api/orders/:id/status
Aktualisiert den Status einer Bestellung (nur Admin).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "shipped",
  "tracking_number": "DHL1234567890",
  "notes": "Versandt via DHL Express"
}
```

---

## Payment

### POST /api/payments/stripe/create-intent
Erstellt ein Stripe Payment Intent.

**Authentication:** Required

**Request Body:**
```json
{
  "order_id": "uuid",
  "amount": 29496,
  "currency": "eur",
  "metadata": {
    "order_number": "ORD-2024-001"
  }
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_1234567890_secret_abcdef",
    "payment_intent_id": "pi_1234567890"
  }
}
```

### POST /api/payments/stripe/webhook
Webhook Endpoint für Stripe-Events.

**Headers:**
```
Stripe-Signature: t=timestamp,v1=signature
```

### POST /api/payments/paypal/create-order
Erstellt eine PayPal-Bestellung.

**Authentication:** Required

### POST /api/payments/paypal/capture
Erfasst eine PayPal-Zahlung.

**Authentication:** Required

---

## KI-Services

### POST /api/ai/advice
Fordert KI-Beratung für eine Konfiguration an.

**Authentication:** Required

**Request Body:**
```json
{
  "configuration_id": "uuid",
  "question": "Wie kann ich die Kosten dieser Konfiguration reduzieren?",
  "context": {
    "budget": 200,
    "experience_level": "beginner",
    "requirements": ["walking", "stable"]
  }
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "advice": "Für eine kosteneffiziente Walking-Bot Konfiguration empfehle ich...",
    "suggestions": [
      {
        "type": "component_substitution",
        "current_component": "MG996R",
        "suggested_component": "MG90S",
        "savings": 45.50,
        "reason": "Ausreichend für leichte Anwendungen"
      }
    ],
    "estimated_savings": 67.80,
    "confidence": 0.85
  }
}
```

### POST /api/ai/generate-guide
Generiert eine Bauanleitung für eine Konfiguration.

**Authentication:** Required

**Request Body:**
```json
{
  "configuration_id": "uuid",
  "language": "de",
  "detail_level": "detailed",
  "include_images": true
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "guide": {
      "title": "Bauanleitung: Walking Bot v1",
      "introduction": "Diese Anleitung führt Sie durch...",
      "steps": [
        {
          "step": 1,
          "title": "Vorbereitung der Komponenten",
          "description": "Prüfen Sie alle Komponenten...",
          "duration": "15 Minuten",
          "tools": ["Schraubendreher", "Zange"],
          "images": ["/guides/step1.jpg"],
          "warnings": ["Vorsicht beim Löten"]
        }
      ],
      "troubleshooting": [
        {
          "problem": "Servo bewegt sich nicht",
          "solutions": ["Stromversorgung prüfen", "Verkabelung kontrollieren"]
        }
      ]
    },
    "audio_url": "/guides/audio/walking-bot-v1-de.mp3",
    "pdf_url": "/guides/pdf/walking-bot-v1-de.pdf"
  }
}
```

### POST /api/ai/tts
Konvertiert Text zu Sprache.

**Authentication:** Required

**Request Body:**
```json
{
  "text": "Willkommen zur Bauanleitung Ihres Roboters",
  "language": "de",
  "voice": "female",
  "speed": 1.0
}
```

**Antwort:**
```json
{
  "success": true,
  "data": {
    "audio_url": "/tts/generated-audio-uuid.mp3",
    "duration": 5.2,
    "format": "mp3",
    "sample_rate": 22050
  }
}
```

---

## Admin Endpoints

### GET /api/admin/stats
Gibt Statistiken für das Admin-Dashboard zurück.

**Authentication:** Required (Admin)

**Antwort:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_orders": 156,
      "total_revenue": 15420.50,
      "total_users": 89,
      "active_configurations": 234
    },
    "recent_orders": [],
    "top_components": [],
    "revenue_chart": {
      "labels": ["Jan", "Feb", "Mar"],
      "data": [1200, 1800, 2100]
    }
  }
}
```

### GET /api/admin/users
Gibt alle Benutzer zurück (nur Admin).

### PUT /api/admin/users/:id
Aktualisiert Benutzer-Informationen (nur Admin).

---

## Rate Limiting

Alle API-Endpoints sind rate-limitiert:

- **Allgemeine Endpoints**: 100 Requests/Minute
- **Auth Endpoints**: 5 Login-Versuche/Minute
- **AI Endpoints**: 10 Requests/Minute
- **Admin Endpoints**: 200 Requests/Minute

Bei Überschreitung wird HTTP 429 zurückgegeben:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

---

## Fehlerbehandlung

### Validierungsfehler (422)
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": ["Email ist nicht gültig"],
    "password": ["Passwort muss mindestens 8 Zeichen haben"]
  }
}
```

### Authentifizierungsfehler (401)
```json
{
  "success": false,
  "error": "Token ist ungültig oder abgelaufen",
  "code": "INVALID_TOKEN"
}
```

### Autorisierungsfehler (403)
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

### Ressource nicht gefunden (404)
```json
{
  "success": false,
  "error": "Komponente nicht gefunden",
  "code": "RESOURCE_NOT_FOUND"
}
```