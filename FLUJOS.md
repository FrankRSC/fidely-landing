# Fidely — Flujos Completos del Sistema

## Arquitectura General

| Proyecto | Tecnología | Rol |
|---|---|---|
| `fidely` (backend) | NestJS + Supabase | API REST |
| `fidely front` | Flutter | App móvil (admin + cliente) |
| `fidely landing` | HTML estático | Registro sin app (web) |

---

## Flujo 1: Registro de Cliente (Sin App)

```
Usuario escanea QR del negocio
└─> Abre: fidely landing/join.html?businessId=XXX

Landing muestra form (nombre, apellido, email)
└─> POST /wallet/join/:businessId
    { firstName, lastName, email, platform: 'apple'|'google' }

Backend:
├─ Busca/crea usuario en Supabase Auth
├─ Crea registro en tabla 'clients'
├─ Crea tarjeta (points=0, visits=0)
└─ Retorna: { url: '/wallet/add/:cardId' }

Landing redirige a /wallet/add/:cardId
└─ Backend detecta plataforma por User-Agent:
   ├─ iOS     → GET /wallet/apple/:cardId → descarga .pkpass → Apple Wallet
   └─ Android → GET /wallet/google/:cardId → URL JWT → Google Wallet
```

---

## Flujo 2: Registro de Cliente (Con App)

```
Cliente autenticado en app Flutter
└─> Pantalla /scan-add-card (ClientScannerScreen)

Escanea QR del negocio (contiene businessId)
└─> POST /cards/quick-join/:businessId

Backend crea tarjeta para el cliente
└─> App muestra QuickJoinResultScreen

Cliente toca "Añadir a Wallet"
└─> GET /wallet/add/:cardId?format=json&platform=ios|android
└─> Retorna URL → launchUrl() abre Apple/Google Wallet
```

---

## Flujo 3: Dar Stamp/Sello (Staff escanea cliente)

```
Staff (Owner/Employee) en pantalla /scanner
└─> Escanea QR de la tarjeta del cliente

QR de la tarjeta contiene: userCardId

POST /qr/scan-customer { userCardId, amount }

Backend calcula según tipo de template:
├─ POINTS:     points += pointsPerAmount × monto
├─ VISITS:     visits += 1
└─ PERCENTAGE: points += monto × (percentage/100)

Actualiza tabla 'cards', crea en 'purchases' y 'transactions'

Notifica wallets:
├─ Apple: push notification → wallet pide .pkpass actualizado
└─ Google: PATCH al objeto en Google Wallet API

Cliente ve cambio en tiempo real (Supabase Realtime)
```

---

## Flujo 4: Owner Genera QR para Compra (POS)

```
Owner en Dashboard → Template → "Generar QR"
└─> Ingresa monto

GET /qr/generate/purchase?businessId=XXX&cardTemplateId=YYY&amount=50

Backend retorna QR codificado en base64 con:
{
  type: "purchase",
  businessId,
  cardTemplateId,
  amount,
  timestamp   ← expira en 2 minutos
}

App muestra QRDialog con timer de 5 minutos
└─> Cliente o Staff escanea ese QR

POST /qr/scan { qrData: JSON, cardId? }

Backend valida:
├─ QR no expirado (< 2 min)
├─ QR no usado antes (UUID único)
└─ Procesa igual que flujo 3
```

---

## Flujo 5: Canjear Reward

```
Opción A — Auto-canje:
Cuando visits == visits_per_reward (configurado en template)
└─ Backend crea redemption automáticamente
└─ Resetea visits a 0
└─ Notifica al cliente

Opción B — Manual:
POST /redemptions/redeem {
  cardId,
  description: "Café gratis",
  pointsUsed: 50,   // si tipo POINTS
  visitsUsed: 10    // si tipo VISITS
}

Backend valida que la tarjeta tenga suficiente saldo
├─ card.points -= pointsUsed
└─ card.visits -= visitsUsed

Crea en 'redemptions' y 'transactions'
Notifica wallets (balance actualizado)
```

---

## Flujo 6: Actualización de Wallet (Push)

```
Apple Wallet:
1. Al descargar .pkpass → Apple registra dispositivo
   POST /wallet/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
   { pushToken }

2. Backend guarda deviceId + pushToken

3. Cuando hay cambio (stamp/reward):
   Backend → Notificación push a Apple
   Apple   → GET /wallet/v1/passes/:passTypeId/:serialNumber
   Backend → Retorna .pkpass actualizado

Google Wallet:
1. Backend firma JWT → URL pay.google.com/gp/v/save/{JWT}
2. Google almacena el objeto

3. Cuando hay cambio:
   Backend → PATCH walletobjects/v1/loyaltyObject/{objectId}
   Google  → Actualiza automáticamente en dispositivo
```

---

## Roles de Usuario

| Rol | App | Acceso |
|---|---|---|
| `owner` | Flutter | Dashboard, templates, staff, QR, métricas |
| `employee` | Flutter | Solo scanner (POS) |
| `client` | Flutter / Landing | Mis tarjetas, añadir a wallet, historial |

Los owners y employees también son clientes (identidad unificada en Supabase Auth).

---

## Endpoints Principales

### Auth
```
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/change-password
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/profile
```

### Wallet (flujo principal)
```
POST /wallet/join/:businessId          ← Registro sin app + crea tarjeta
GET  /wallet/add/:userCardId           ← Detección de plataforma y redirección
GET  /wallet/apple/:userCardId         ← Descarga .pkpass para Apple Wallet
GET  /wallet/google/:userCardId        ← URL JWT para Google Wallet

# Apple Web Service (notificaciones push)
POST   /wallet/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
DELETE /wallet/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
GET    /wallet/v1/devices/:deviceId/registrations/:passTypeId
GET    /wallet/v1/passes/:passTypeId/:serialNumber
```

### Businesses
```
GET  /businesses/:id
POST /businesses
PUT  /businesses/:id
POST /businesses/:id/logo
```

### Card Templates
```
GET    /card-templates/business/:businessId
POST   /card-templates/business/:businessId
PUT    /card-templates/:templateId
DELETE /card-templates/:templateId
```

### Cards
```
GET  /cards/my-cards
GET  /cards/:cardId
GET  /cards/:cardId/transactions
POST /cards/quick-join/:businessId      ← Cliente con app se une a negocio
POST /cards/business/:businessId        ← Crear tarjeta manual
```

### QR
```
GET  /qr/generate/purchase?businessId=X&cardTemplateId=Y&amount=Z
GET  /qr/generate/redemption?businessId=X
POST /qr/scan { qrData, cardId? }
POST /qr/scan-customer { userCardId, amount }
```

### Purchases & Redemptions
```
POST /purchases
GET  /purchases/my-purchases

POST /redemptions/redeem
GET  /redemptions/my-redemptions
```

### Staff
```
GET    /staff/business/:businessId/employees
POST   /staff
DELETE /staff/:staffId
```

---

## Tablas de Base de Datos

```
auth.users (Supabase)   ← Identidad central de todos los usuarios
clients                 ← Datos del perfil del cliente
staff                   ← Owners y employees (role: owner|employee)
businesses              ← Negocios registrados
card_templates          ← Configuración del programa (tipo, ratios, colores, expiración)
cards                   ← Tarjeta del cliente en un negocio (points, visits)
purchases               ← Historial de acumulaciones
redemptions             ← Historial de canjes
transactions            ← Auditoría unificada (purchases + redemptions + ajustes)
```

### Campos clave de `card_templates`
| Campo | Tipo | Descripción |
|---|---|---|
| `type` | `points\|visits\|percentage` | Tipo de programa |
| `points_per_amount` | decimal | Puntos por unidad de monto |
| `percentage` | decimal | % acumulado (solo tipo percentage) |
| `visits_per_reward` | integer | Sellos necesarios para un reward |

### Campos clave de `cards`
| Campo | Tipo | Descripción |
|---|---|---|
| `points` | integer | Puntos acumulados actuales |
| `visits` | integer | Sellos acumulados actuales |
| `google_wallet_added_at` | timestamp | Cuándo se agregó a Google Wallet |
| `apple_wallet_added_at` | timestamp | Cuándo se agregó a Apple Wallet |

---

## Routing de la App Flutter

```
/splash
/login
/register
/forgot-password
/verify-otp?email=X
/reset-password?token=X           ← Deep link desde email
/onboarding                        ← Owner nuevo sin businessId

/business                          ← Dashboard (owner)
/business/templates                ← Listado de templates
/business/templates/create         ← Crear template + wallet simulator
/business/staff                    ← Gestión de empleados
/business/staff/add
/business/setup                    ← Editar negocio

/scanner                           ← POS para staff
/scanner/result

/my-qr                             ← Cartera del cliente (carousel)
/scan-add-card                     ← Cliente escanea QR del negocio
/scan-add-card/result

/cards/:cardId/history             ← Historial de transacciones
/settings
/settings/change-password
/settings/edit-profile
```

---

## Diagrama Completo del Sistema

```
╔══════════════════════════════════════════════════════════════════╗
║                    SISTEMA FIDELY                                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  REGISTRO (sin app)                                              ║
║  QR → landing/join.html → POST /wallet/join → /wallet/add       ║
║                                    ↓                             ║
║                          iOS: .pkpass (Apple Wallet)             ║
║                          Android: JWT URL (Google Wallet)        ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ACUMULACIÓN (stamp)                                             ║
║  Staff escanea QR cliente → POST /qr/scan-customer              ║
║                                    ↓                             ║
║             points++ o visits++ según tipo de template           ║
║                                    ↓                             ║
║             Notificación push → Wallet actualizado               ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  CANJE (reward)                                                  ║
║  Manual: POST /redemptions/redeem                                ║
║  Auto:   visits == visits_per_reward → auto-redeem               ║
║                                    ↓                             ║
║             points-- o visits-- según tipo                       ║
║                                    ↓                             ║
║             Notificación push → Wallet actualizado               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```
