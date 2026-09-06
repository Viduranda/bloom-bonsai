# 🎓 Student 4: Admin Systems & Cloud Deployment Lead

**Role:** Administrative Management Systems, Customer Portal, DevOps, Security Audit, & Cloud Deployment  
**Project:** Bloom & Bonsai — Luxury Botanical E-Commerce Platform  

---

## 📂 1. Assigned Modules & File Ownership

| File / Component | Type | Responsibility |
| :--- | :--- | :--- |
| `admin_dash.html` | Admin UI | Administrative portal dashboard layout, inventory management modal, & sales graphs |
| `api/admin/*` | Admin API | Real-time analytics (`stats.php`), product CRUD (`products.php`), and order status updater (`orders.php`) |
| `dashboard.html` | Customer UI | Customer account portal, order history tracking, & 24-hour cancellation window |
| `mygarden.html` | Customer UI | Virtual "My Garden" personal plant collection tracker & health logger |
| `api/mygarden/*` | Customer API | Plant collection backend (`get.php`, `add.php`, `update.php`) |
| `.htaccess` & `api/.env` | Server Config | Apache web server configuration, `.env`/`.log` file access blocking, CORS headers, & static asset cache versioning |

---

## 📊 2. Technical Contributions & Feature Implementations

### A. Admin Management Portal (`admin_dash.html`, `api/admin/*`)
* **Real-time Analytics Dashboard (`stats.php`):** Built metrics aggregator tracking Total Sales Revenue (LKR), Active Orders, Stock Alerts, and Customer Counts.
* **Product Catalog CRUD & Care Plan Builder (`products.php`):** Developed product management interface allowing administrators to add/edit plants, update prices, manage stock levels, and assign 4-Week Care Plans.
* **Order Status Management (`orders.php`):** Built administrative order updater allowing status transitions (`pending` → `confirmed` → `processing` → `shipped` → `delivered` → `cancelled`).

### B. Customer Account Portal & My Garden (`dashboard.html`, `mygarden.html`)
* **Order History & Tracking:** Built customer dashboard displaying past orders, itemized receipts, delivery status badges, and PDF invoice downloads.
* **24-Hour Order Cancellation:** Implemented customer cancellation window allowing users to cancel orders within 24 hours of placement.
* **Virtual Plant Tracker ("My Garden"):** Created user plant collection portal allowing customers to track watering schedules, growth notes, and plant health logs.

### C. Cloud Deployment & Server Infrastructure (`.htaccess`, AlwaysData Hosting)
* **AlwaysData Apache Setup:** Configured production environment on AlwaysData cloud hosting with remote MySQL connection pool (`mysql-bloom-bonsai.alwaysdata.net`).
* **Server Security & Access Blocking (`.htaccess`):** Hardened server security by implementing Apache rules to block unauthorized public downloads of sensitive configuration files (`.env`, `.log` files).
* **Cache Management:** Maintained static asset versioning (`script.js?v=44.0`) to prevent browser cache stale state issues across deployments.

---

## 🔍 3. Verification & Key Code Snippets

```apache
# Server Protection Rule (.htaccess)
<FilesMatch "^\.env|\.log$">
    Require all denied
</FilesMatch>

# CORS & Header Security
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, Authorization"
```

```php
// Admin Authorization Security Guard (api/auth.php)
function requireAdmin() {
    $user = requireAuth();
    if (($user['role'] ?? '') !== 'admin') {
        respond(['success' => false, 'error' => 'Forbidden. Admin access required.'], 403);
    }
    return $user;
}
```
