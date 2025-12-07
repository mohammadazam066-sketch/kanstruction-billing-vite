# **App Name**: SwiftBill

## Core Features:

- Product Selection: Categorized product selection using cascading dropdowns (Category -> Product).
- Dynamic Input Fields: Input fields for quantity and unit price with a dropdown for GST rate (0%, 5%, 12%, 18%, 28%).
- Item Addition: Add items to the bill with automatic calculation of GST amount and total per item.
- Bill Summary: Real-time calculation and display of subtotal, total GST, and grand total.
- Invoice Generation: Generate and print a clean, A4-sized invoice with item details and total breakup. Generates the proper formatting for the numbers and includes a tool which determines when and where to show tax data.
- Business Details: Optional fields for business name, owner name, and GSTIN to include on the invoice.
- Data persistence (Optional): Save all added items to the Firestore database (optional, will be developed at a later date if requested)

## Style Guidelines:

- Primary color: Muted blue (#5DADE2) to evoke trust and professionalism.
- Background color: Light gray (#F5F7FA) to provide a clean, uncluttered backdrop.
- Accent color: Soft green (#A9DFBF) for key actions and highlights, indicating clarity and efficiency.
- Body and headline font: 'PT Sans', a humanist sans-serif.
- Use simple, clear icons for product categories and actions.
- Card-based layout with rounded corners and soft shadows for product entry and bill summary sections.
- Subtle animations for item addition and total updates to provide a smooth user experience.