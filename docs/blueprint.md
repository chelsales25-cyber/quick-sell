# App Name: QuickSell

## Core Features

- User authentication (login/logout)
- Dashboard: sales summary, recent transactions
- Product management: list, add, edit, scan QR code
- Manual price/quantity adjustment during sale
- Sync data to Google Sheets automatically
- Responsive design for mobile and desktop
- PWA support (installable, offline, splash screen)
- Toast/notification for actions and errors

## Style & Consistency

- Primary color: Blue (#2563eb)
- Background: Soft blue/white (#f5f8ff)
- Accent: Green (#22c55e) for success, Red (#ef4444) for errors
- Font: 'Inter' (sans-serif) for all text
- Use lucide-react icons, consistent size and color
- Logo, app name, and icons must be the same in all screens and manifest
- All UI text should be in Thai (or English, but consistent)
- Button, card, and navigation design must be consistent
- Loading and error states must use the same style throughout

## UX/UI Guidelines

- Sticky header and bottom navigation for mobile
- Centered card for login and error states
- Responsive layout for all devices
- Subtle animation for loading (logo bounce/spinner)
- Accessibility: good contrast, aria-labels, keyboard navigation

## PWA & Manifest

- Manifest icons: 128x128, 192x192, 256x256, 512x512 px
- Splash screen: background #f5f8ff, theme #2563eb
- App name and short_name: QuickSell
- Screenshots for install preview

## Data & Integration

- Google Sheets sync: batch update, error handling, last sync info
- Local cache for offline use

## Development

- Use TypeScript, Next.js app router
- Organize code by feature (dashboard, products, sales, etc.)
- Use consistent naming for files, components, and variables

## Future Improvements

- Multi-language support
- Role-based access (admin/user)
- AI integration for analytics or smart search
