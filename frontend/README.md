# Vighneshwara Frontend

A modern React.js frontend for Vighneshwara Enterprises business management system.

## Recent Updates

✅ **Removed Firebase dependency** - Now uses backend API directly
✅ **Added API integration** - Connects to existing backend endpoints
✅ **Maintained all features** - Dashboard, Vehicles, Scrap, Bills management
✅ **Real-time updates** - Same functionality as before but with backend API

## Features

- **Dashboard**: Business metrics and analytics
- **Vehicle Management**: Track vehicle income and expenses
- **Scrap Management**: Handle scrap trading transactions
- **Bill Management**: Generate and manage customer bills
- **Real-time Updates**: Live data synchronization
- **Responsive Design**: Works on desktop and mobile
- **Offline Support**: PWA capabilities with service worker

## Setup Instructions

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Backend URL**:
   - Update `.env` file with your backend URL
   - Default: `VITE_API_URL=http://localhost:3001/api`

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Backend Integration

The frontend now connects directly to your backend API:

- **Dashboard**: `/api/analytics/dashboard-summary`
- **Vehicles**: `/api/vehicles/*`
- **Scrap**: `/api/scrap/*`
- **Bills**: `/api/bills/*`
- **Analytics**: `/api/analytics/*`

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:3001/api

# Development settings
VITE_NODE_ENV=development
```

### API Endpoints

The app expects these backend endpoints to be available:

- `GET /api/analytics/dashboard-summary` - Dashboard data
- `GET /api/analytics/weekly-summary` - Weekly analytics
- `GET /api/vehicles` - Vehicle management
- `GET /api/scrap` - Scrap transactions
- `GET /api/bills` - Bill management

## Migration from Firebase

The app has been updated to remove Firebase dependencies:

- ❌ **Removed**: Firebase Context, Firebase hooks
- ✅ **Added**: API Context, API hooks
- ✅ **Maintained**: All existing functionality
- ✅ **Improved**: Direct backend integration

## Tech Stack

- React 18 with Vite
- Material-UI (MUI) for components
- React Router for navigation
- Axios for API calls
- Chart.js for analytics
- Framer Motion for animations
- React Hook Form for forms
- React Hot Toast for notifications

## Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

1. **API Connection Issues**: Check backend URL in `.env` file
2. **CORS Errors**: Ensure backend allows frontend origin
3. **Build Errors**: Clear node_modules and reinstall dependencies