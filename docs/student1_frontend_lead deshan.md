# 🎓 Student 1: Lead Frontend Developer & UI/UX Engineer

**Role:** Client-Side Architecture, Responsive Web Design, Component UI & Interaction Engineering  
**Project:** Bloom & Bonsai — Luxury Botanical E-Commerce Platform  

---

## 📂 1. Assigned Modules & File Ownership

| File / Component | Type | Responsibility |
| :--- | :--- | :--- |
| `style.css` | Stylesheet | Central CSS variables (`:root`), typography, color palette, animations, modals, and responsive breakpoints |
| `index.html` | Markup | Homepage layout, video hero background, featured products carousel, and footer navigation |
| `shop.html` | Markup | Product catalog grid, category filter bar, search input, and mobile 2-column layout |
| `script.js` (UI Portion) | JavaScript | Toast notification framework (`showToast`), Product Detail Modal (`#productModal`), and Verified Reviews Modal (`#reviewModal`) |

---

## 🎨 2. Technical Contributions & Feature Implementations

### A. Design System & CSS Architecture (`style.css`)
* **Color Palette & CSS Variables:** Configured luxury botanical theme variables:
  * Primary Forest Green: `#17482f`
  * Luxury Gold Accent: `#c9a227`
  * Soft Background: `#fbf9f4`
  * Dark Container Accent: `#11291b`
* **Typography:** Integrated Google Fonts (`Playfair Display` for serif headings and `Inter` / `System UI` for body text).
* **Responsive Flex & Grid Layouts:** Built responsive breakpoints using media queries (`@media (max-width: 768px)` and `@media (max-width: 480px)`).

### B. Sticky Navigation & Mobile Menu (`index.html`, `style.css`)
* Designed a sticky navigation bar with active tab highlights.
* Created a mobile hamburger menu (`☰`) with slide-out navigation for mobile screens.
* Built dynamic cart badge update logic showing real-time item counts.

### C. Shop Catalog & Mobile Product Grid (`shop.html`)
* Implemented category filtering bar (Bonsai, Flowering, Foliage, Succulents).
* Designed 2-column app grid layout for smartphones and 4-column layout for desktop.
* Created interactive hover effects, sale badges, and pricing displays in Sri Lankan Rupees (`Rs.`).

### D. Interactive UI Modals & Toast Framework (`script.js`)
* **Toast Notification Engine (`showToast`):** Non-blocking bottom-right notification popups for cart additions, errors, and system alerts.
* **Product Quick View Modal (`#productModal`):** Popup modal displaying high-res product image gallery, scientific name, stock status, care parameters, and quick "Add to Cart" button.
* **Verified Reviews Modal (`#reviewModal`):** Rating breakdown, star review renderer, and verified buyer review submission form.

---

## 🔍 3. Verification & Key Code Snippets

```css
/* Custom Botanical CSS Variables */
:root {
  --primary: #17482f;
  --secondary: #c9a227;
  --bg-light: #fbf9f4;
  --text-dark: #222222;
  --border-color: #e7e2d3;
}
```

```javascript
// Non-blocking Toast Alert Framework
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'error' ? '#dc3545' : '#2D6A4F';
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
```
