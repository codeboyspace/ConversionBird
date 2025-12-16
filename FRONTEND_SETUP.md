# 🚀 ConversionBird Frontend Setup Guide

## Quick Start - Launch Dashboard on localhost:3000

### Step 1: Ensure Backend is Running
```bash
# In the main project directory
npm run dev
# Backend should be running on http://localhost:5000
```

### Step 2: Launch Frontend
```bash
# Open a new terminal
cd frontend
npm run dev
```

The dashboard will be available at: **http://localhost:3000**

## 🎯 What You'll See

### Landing Page (http://localhost:3000)
- Beautiful homepage with ConversionBird branding
- Feature highlights
- Pricing plans (Free, Pro, Business)
- Login and Register buttons

### Available Routes
- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/dashboard` - Main dashboard (requires login)
- `/dashboard/api-keys` - API key management
- `/dashboard/billing` - Billing and plans
- `/dashboard/usage` - Usage statistics

## 🔧 Testing the Complete Flow

### 1. Register a New User
1. Go to http://localhost:3000
2. Click "Get Started" or "Register"
3. Enter email and password
4. Submit the form

### 2. Login
1. Go to http://localhost:3000/login
2. Enter your credentials
3. You'll be redirected to the dashboard

### 3. Create API Keys
1. Navigate to Dashboard → API Keys
2. Enter a label for your key
3. Click "Create"
4. Copy the generated API key

### 4. Test Image Conversion
```bash
# Use your API key to convert an image
curl -X POST http://localhost:5000/api/images/convert \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -F "image=@test.jpg" \
  -F "format=png"
```

## 📊 Dashboard Features

### Main Dashboard
- Current plan display
- Monthly conversion count
- Quick access to API keys and billing

### API Keys Page
- Create new API keys
- View all your keys
- Activate/deactivate keys
- Delete keys
- See last used timestamp

### Billing Page
- View current plan
- Upgrade to Pro or Business
- Cancel subscription
- See plan features and limits

## 🔄 API Proxy Configuration

The frontend is configured to proxy API calls to the backend:
- Frontend calls `/api/*` → Backend `http://localhost:5000/api/*`
- This is configured in `next.config.ts`

## 🐛 Troubleshooting

### Frontend won't start
```bash
# Make sure you're in the frontend directory
cd frontend

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

### API calls return 404
1. Ensure backend is running on port 5000
2. Check `next.config.ts` has the correct proxy configuration
3. Restart the frontend after making changes

### Can't login/register
1. Check MongoDB is running
2. Verify backend logs for errors
3. Check browser console for errors

## 🎨 Customization

### Change Colors
Edit `frontend/src/app/globals.css` for theme colors

### Modify Landing Page
Edit `frontend/src/app/page.tsx`

### Update Dashboard
Edit files in `frontend/src/app/dashboard/`

## 📝 Environment Variables

Frontend uses the backend API, so make sure your backend `.env` is configured:
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/conversionbird
JWT_SECRET=your-secret-key
```

## ✅ Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] MongoDB connected
- [ ] Can access landing page
- [ ] Can register new user
- [ ] Can login
- [ ] Can access dashboard
- [ ] Can create API keys
- [ ] Can convert images with API key

## 🎉 You're Ready!

Your ConversionBird SaaS dashboard is now live at http://localhost:3000!

Test the complete user journey:
1. Register → 2. Login → 3. Create API Key → 4. Convert Images → 5. Track Usage