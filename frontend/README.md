# ConversionBird - SaaS Frontend

A complete, production-ready Next.js frontend for ConversionBird image conversion API service.

## Features

### Landing Page
- Professional hero section with clear value proposition
- Feature highlights showcasing key capabilities
- Pricing table with Free, Pro, and Business tiers
- Responsive design for desktop and mobile

### Authentication
- Login page with email/password authentication
- Registration page with validation
- JWT token management with localStorage
- Automatic redirect to dashboard after login
- Protected routes with auth guards

### Dashboard
- **Overview**: Display user stats, plan details, and usage metrics
- **API Keys**: Create, manage, toggle, and delete API keys with masked display
- **Convert**: Upload images and convert to different formats with drag-and-drop
- **Billing**: View current subscription, upgrade/downgrade plans, cancel subscription

### Technical Features
- Next.js 14 with App Router
- TailwindCSS for styling
- Axios for API calls with interceptors
- Context API for state management
- Fully responsive mobile design
- Clean, modular code structure

## Project Structure

```
app/
  auth/
    login/page.tsx          # Login page
    register/page.tsx       # Registration page
  dashboard/
    layout.tsx              # Dashboard layout with sidebar
    page.tsx                # Dashboard home
    api-keys/page.tsx       # API key management
    billing/page.tsx        # Subscription management
    convert/page.tsx        # Image conversion
  layout.tsx                # Root layout
  page.tsx                  # Landing page

components/
  Navbar.tsx                # Landing page navigation
  ui/                       # Reusable UI components

contexts/
  AuthContext.tsx           # Authentication state management

lib/
  api.ts                    # Axios configuration and API methods
```

## API Integration

The frontend connects to your backend at `http://localhost:5000` with the following endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### API Keys
- `GET /api/keys` - Get all API keys
- `POST /api/keys` - Create new API key
- `PUT /api/keys/:id` - Update API key
- `DELETE /api/keys/:id` - Delete API key

### Image Conversion
- `GET /api/images/formats` - Get supported formats
- `POST /api/images/convert` - Convert image

### Billing
- `GET /api/billing/subscription` - Get subscription details
- `POST /api/billing/subscription` - Subscribe to plan
- `DELETE /api/billing/subscription` - Cancel subscription

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start your backend server on `http://localhost:5000`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

```bash
npm run build
npm run start
```

## Design System

- **Primary Color**: #2563eb (blue-600)
- **Text Color**: #1e293b (slate-800)
- **Background**: White with slate-50 gradients
- **Font**: Inter (via next/font/google)

## Authentication Flow

1. User enters credentials on login/register page
2. JWT token is saved to localStorage
3. Token is automatically attached to all API requests via Axios interceptor
4. Dashboard routes check for authentication and redirect to login if needed
5. 401 responses automatically log user out and redirect to login

## Key Features

- **Auto-refresh usage stats** after conversions
- **Masked API keys** with show/hide toggle
- **Drag-and-drop file upload** for image conversion
- **Real-time usage tracking** with progress bars
- **Mobile-responsive sidebar** with hamburger menu
- **Loading states** for all async operations
- **Error handling** with user-friendly messages

## Notes

- The frontend expects your backend to return user data in the format shown in AuthContext
- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- All API calls use the base URL `http://localhost:5000`
- Update the base URL in `lib/api.ts` for production deployment
