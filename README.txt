FOODBRIDGE - FOOD WASTE MANAGEMENT SYSTEM
==========================================

TECHNOLOGIES
- HTML5
- CSS3
- JavaScript
- localStorage (browser storage)

HOW TO RUN
1. Extract this ZIP file.
2. Open the extracted Food-Waste-Management-System folder in VS Code.
3. Install the "Live Server" extension if you do not already have it.
4. Right-click index.html and choose "Open with Live Server".
5. The site should open in your browser.

DEMO ADMIN LOGIN
Email: admin@foodbridge.demo
Password: Admin@123

FIRST STEPS
1. Open Register and create a donor account.
2. Add a donation from the donor dashboard.
3. Open a second browser profile or use a separate account in the same browser to create a receiver account.
4. Request food from the receiver dashboard.
5. Log back in as the donor, approve the request, and use the displayed collection code to confirm pickup.
6. Log in as admin to view analytics, export CSV, and delete donation records.

DEMO DATA
The homepage starts with three illustrative sample donations. They are examples for testing, not real offers. You can delete them from the admin dashboard.

IMPORTANT LIMITATIONS
- localStorage is limited to one browser profile on one device. It does not synchronize between users/devices.
- This is a learning/demo application, not a production service.
- Passwords and role checks are stored/checked client-side and are not secure.
- Do not use the demo as a real food-safety certification system. Donors must follow applicable food-safety requirements.
- The simple matching logic ranks donations by area text, urgency, and quantity. It is not AI.
- Collection codes are a demo verification mechanism, not secure authentication.

If the site was previously tested with old data and behaves unexpectedly, use browser DevTools > Application > Local Storage and clear keys beginning with foodbridge_, then refresh. This removes demo users and donations saved in that browser.
