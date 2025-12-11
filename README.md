# ConversionBird - Image Conversion SaaS

A complete SaaS platform for image format conversion with user authentication, API keys, plan limits, and Razorpay billing integration.

## Features

- ✅ User Authentication (JWT)
- ✅ API Key Management
- ✅ Plan-based Limits (Free/Pro/Business)
- ✅ Usage Tracking & Logging
- ✅ Razorpay Subscription Billing
- ✅ Image Format Conversion
- ✅ VPS Deployment Ready

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Payment**: Razorpay
- **Image Processing**: Sharp, ImageMagick
- **Deployment**: PM2, NGINX

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd conversionbird
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. MongoDB Setup

```bash
# Install MongoDB locally or use cloud service
# For Ubuntu/Debian:
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb
# or
mongod
```

### 4. Razorpay Setup (Optional for initial testing)

1. Create Razorpay account at https://razorpay.com
2. Create subscription plans:
   - Pro Plan (₹499/month)
   - Business Plan (₹1999/month)
3. Get API keys and plan IDs from Razorpay dashboard
4. Update .env with Razorpay credentials

### 5. Run Backend

```bash
npm run dev
# Server will start on http://localhost:5000
```

### 6. Run Frontend (Optional)

**Note:** Frontend requires Node.js >= 20.9.0. If you have an older version, skip this step - the backend API works perfectly without it.

```bash
# Check your Node.js version
node --version  # Should be >= 20.9.0

# If you have the correct version:
cd frontend
npm install
npm run dev
# Frontend will start on http://localhost:3000
```

**Alternative:** Use API testing tools like Postman or curl to interact with your backend directly.
```

### 6. Production Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Setup NGINX (copy nginx.conf to /etc/nginx/sites-available/)
sudo ln -s /etc/nginx/sites-available/conversionbird /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user info

### API Keys
- `POST /api/keys` - Create API key
- `GET /api/keys` - List API keys
- `PUT /api/keys/:id` - Update API key
- `DELETE /api/keys/:id` - Delete API key

### Billing
- `POST /api/billing/subscription` - Create subscription
- `GET /api/billing/subscription` - Get subscription status
- `DELETE /api/billing/subscription` - Cancel subscription
- `POST /api/billing/webhook` - Razorpay webhook

### Image Conversion
- `POST /api/images/convert` - Convert image (requires API key)
- `POST /api/images/process-image` - Process image (requires API key)
- `GET /api/images/formats` - Get supported formats

## Plans & Limits

| Plan | Monthly Conversions | Max File Size |
|------|-------------------|---------------|
| Free | 1,000 | 5MB |
| Pro | 10,000 | 25MB |
| Business | 100,000 | 100MB |

## Usage

### API Key Authentication

Include API key in headers:
```
x-api-key: cb_your_api_key_here
```

### Convert Image Example

```bash
curl -X POST http://localhost:5000/api/images/convert \
  -H "x-api-key: cb_your_key" \
  -F "image=@photo.jpg" \
  -F "format=png"
```

Response:
```json
{
  "downloadUrl": "https://yourdomain.com/files/converted.png",
  "formatFrom": "jpeg",
  "formatTo": "png",
  "originalSize": 2048576,
  "convertedSize": 1536000
}
```

## Directory Structure

```
conversionbird/
├── app.js                 # Main server
├── controllers/           # Route controllers
├── routes/               # API routes
├── services/             # Business logic
├── models/               # MongoDB models
├── middleware/           # Express middleware
├── uploads/              # File uploads
│   ├── input/           # Temp input files
│   └── output/          # Converted files
├── frontend/            # Next.js dashboard (optional)
├── nginx.conf           # NGINX config
├── ecosystem.config.js  # PM2 config
└── .env.example         # Environment template
```

## Razorpay Webhook Setup

1. Set webhook URL: `https://yourdomain.com/api/billing/webhook`
2. Events to subscribe:
   - `subscription.activated`
   - `subscription.paused`
   - `subscription.cancelled`
   - `subscription.completed`
3. Use webhook secret in .env

## Monthly Reset

Add cron job to reset monthly conversions:

```bash
# Add to crontab (runs 1st of every month at midnight)
0 0 1 * * node -e "require('./services/UsageService').resetMonthlyConversions()"
```

## Troubleshooting

### ImageMagick Issues
```bash
# Install ImageMagick
sudo apt-get install imagemagick

# For PDF support
sudo apt-get install ghostscript
```

### MongoDB Connection
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

## License

ISC
