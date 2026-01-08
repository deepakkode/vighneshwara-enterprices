# Vighneshwara Enterprises Dashboard

A modern, comprehensive business management dashboard for Vighneshwara Enterprises, featuring vehicle income tracking, scrap trading management, and professional bill generation.

## 🚀 Features

- **Vehicle Management**: Track income and expenses for lorry and truck/auto operations
- **Scrap Trading**: Manage scrap purchases and sales with automatic calculations
- **Bill Generation**: Create professional purchase vouchers and GST-compliant tax invoices
- **Real-time Dashboard**: Live updates with WebSocket integration
- **Analytics**: Comprehensive business performance analytics
- **Mobile App**: React Native app with APK generation for direct installation
- **Modern UI**: Material-UI with custom Vighneshwara branding

## 🛠️ Technology Stack

### Backend
- **Node.js 20+** with Express.js and modern ES modules
- **SQLite** (development) / **PostgreSQL 16+** (production) with Prisma ORM
- **Socket.io** for real-time updates
- **JWT Authentication** with refresh tokens
- **Puppeteer** for PDF bill generation

### Frontend
- **React.js 18+** with latest JavaScript (ES2024) features
- **Material-UI v5+** with custom theming
- **Redux Toolkit** with RTK Query
- **Vite** for fast development and building
- **Chart.js 4+** for data visualization

### Mobile
- **React Native** with Expo for cross-platform development
- **APK generation** for direct installation
- **Native features** (camera, biometric auth, push notifications)

## 📋 Prerequisites

- **Node.js 20+** and npm 10+
- **PostgreSQL 16+** (or use Docker)
- **Docker & Docker Compose** (optional, for containerized development)

## 🚀 Quick Start

### Option 1: Automated Setup

```bash
# Clone the repository
git clone <repository-url>
cd vighneshwara-enterprices

# Run automated setup
node scripts/setup.js

# Start PostgreSQL (if using Docker)
docker-compose up postgres -d

# Set up database
npm run db:setup

# Start development servers
npm run dev
```

### Option 2: Manual Setup

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/vighneshwara_db"

# Generate Prisma client
cd backend && npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database
npm run db:seed

# Start development servers
npm run dev
```

### Option 3: Docker Development

```bash
# Start all services with Docker
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🌐 Access Points

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health
- **Prisma Studio**: `cd backend && npx prisma studio`

## 🔐 Default Credentials

### Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Owner (full access)

### Operator User
- **Username**: `operator`
- **Password**: `operator123`
- **Role**: Operator (limited access)

## 📁 Project Structure

```
vighneshwara-enterprices/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── database/       # Database seeds and utilities
│   ├── prisma/             # Database schema and migrations
│   └── uploads/            # File uploads storage
├── frontend/               # React.js web application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and API slices
│   │   ├── theme/          # Material-UI theme configuration
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── mobile/                 # React Native mobile app (to be created)
├── scripts/                # Development and deployment scripts
└── docker-compose.yml      # Docker services configuration
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Run tests with coverage
npm run test:coverage
```

## 📱 Mobile App Development

The mobile app will be developed using React Native with Expo:

```bash
# Initialize mobile app (Task 12.1)
cd mobile
npx create-expo-app . --template blank
npm install

# Development
npm run start

# Build APK
eas build --platform android --profile production
```

## 🔧 Database Management

```bash
# Generate Prisma client
cd backend && npx prisma generate

# Create and run migrations
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Seed database
npm run db:seed

# Open Prisma Studio
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Vehicle Endpoints
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles/transactions` - Create vehicle transaction
- `GET /api/vehicles/transactions` - Get vehicle transactions

### Scrap Endpoints
- `GET /api/scrap` - Get all scrap transactions
- `POST /api/scrap/purchase` - Create scrap purchase
- `POST /api/scrap/sale` - Create scrap sale

### Bill Endpoints
- `GET /api/bills` - Get all bills
- `POST /api/bills/purchase-voucher` - Generate purchase voucher
- `POST /api/bills/tax-invoice` - Generate tax invoice

### Analytics Endpoints
- `GET /api/analytics/dashboard` - Get dashboard metrics
- `GET /api/analytics/vehicle-performance` - Get vehicle analytics
- `GET /api/analytics/scrap-performance` - Get scrap analytics

## 🎨 Customization

### Company Branding
The application uses Vighneshwara Enterprises branding:
- **Colors**: Red (#E53E3E), Blue (#3182CE), Green (#38A169)
- **Logo**: VES logo with gradient styling
- **Typography**: Inter and Roboto fonts

### Bill Templates
Bill formats exactly match existing offline templates:
- **Purchase Voucher**: Local purchase voucher format
- **Tax Invoice**: GST-compliant tax invoice format

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Build backend (if needed)
cd backend && npm run build

# Start production server
npm start
```

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: support@vighneshwara.com
- **Phone**: +91 9032164165
- **Address**: Plot No. 25, Phase-2, Nellore

## 🔄 Development Workflow

This project follows a spec-driven development approach:

1. **Requirements** → Define what needs to be built
2. **Design** → Plan the architecture and components
3. **Tasks** → Break down into actionable implementation steps
4. **Implementation** → Build features incrementally
5. **Testing** → Validate with unit and property-based tests

Current implementation status can be tracked in the task list at `.kiro/specs/income-dashboard/tasks.md`.

---

**Vighneshwara Enterprises** - Modern Business Management Dashboard