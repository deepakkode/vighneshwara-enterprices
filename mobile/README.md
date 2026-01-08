# 📱 Vighneshwara Enterprises Mobile App

A complete business management mobile application built with React Native and Expo.

## 🚀 Features

### 📊 Dashboard
- Real-time business overview
- Financial summaries
- Quick action buttons
- Statistics cards for all modules

### 🚛 Vehicles Management
- Add, edit, delete vehicles
- Track vehicle details (number, type, driver info)
- Vehicle capacity and status management
- Search and filter functionality

### ♻️ Scrap Management
- Manage scrap items and categories
- Track weight, pricing, and customers
- Calculate total amounts automatically
- Customer contact management

### 💰 Expenses Tracking
- Record business expenses by category
- Link expenses to specific vehicles
- Multiple payment methods support
- Date-wise expense tracking

### 📄 Bills Management
- Create and manage customer bills
- Track payment status (pending, paid, overdue)
- Customer information and contact details
- Due date management

## 🎨 Design Features

- **Bright Color Scheme**: WhatsApp Green (#25D366), Facebook Blue (#1877F2), Orange (#FF6B35)
- **Material Design**: Using React Native Paper components
- **Intuitive Navigation**: Bottom tab navigation with icons
- **Responsive UI**: Optimized for mobile devices
- **Real-time Updates**: Live data from backend API

## 🛠️ Technology Stack

- **React Native** with Expo
- **React Navigation** for navigation
- **React Native Paper** for UI components
- **Axios** for API calls
- **AsyncStorage** for local data
- **Expo Vector Icons** for icons

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js installed
- Expo Go app on your phone
- Backend server running at `http://10.162.58.180:3001`

### Installation & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the app (recommended):**
   ```bash
   npm run start-clean
   ```
   
   Or use standard Expo start:
   ```bash
   npm start
   ```

3. **Scan QR code** with Expo Go app on your phone

### 📱 Testing on Phone

1. Make sure your phone is connected to the same WiFi network as your computer
2. Open Expo Go app on your phone
3. Scan the QR code displayed in terminal
4. The app will load and connect to the backend automatically

## 🔧 Configuration

### Backend Connection
The app connects to the backend at `http://10.162.58.180:3001/api`

### App Configuration
- **Updates disabled**: No EAS or over-the-air updates
- **Offline mode**: Works without Expo account
- **Local development**: Optimized for local testing

## 📁 Project Structure

```
src/
├── context/
│   └── ApiContext.js          # API calls and state management
├── navigation/
│   └── AppNavigator.js        # Bottom tab navigation
├── screens/
│   ├── DashboardScreen.js     # Main dashboard
│   ├── VehiclesScreen.js      # Vehicle management
│   ├── ScrapScreen.js         # Scrap management
│   ├── ExpensesScreen.js      # Expense tracking
│   └── BillsScreen.js         # Bill management
└── theme/
    └── colors.js              # App theme and colors
```

## 🎯 Key Features

### Real Data Integration
- All data comes from user inputs (no mock data)
- Real-time synchronization with backend
- Persistent data storage

### User-Friendly Interface
- Search functionality on all screens
- Add/Edit/Delete operations with confirmations
- Loading states and error handling
- Refresh-to-reload functionality

### Business Logic
- Automatic calculations (scrap totals, expense summaries)
- Status tracking (vehicle status, payment status)
- Date management and filtering
- Customer contact management

## 🚨 Troubleshooting

### Common Issues

1. **Infinite Loading**: Make sure backend is running at correct IP
2. **Network Error**: Check WiFi connection and IP address
3. **Expo Login Prompt**: Use `npm run start-clean` to avoid login requirements

### Backend Connection
Ensure backend is running with:
```bash
# In backend directory
npm start
```

Backend should be accessible at `http://10.162.58.180:3001`

## 📞 Support

For issues or questions, check:
1. Backend server status
2. Network connectivity
3. Expo Go app version
4. Node.js and npm versions

---

**Built for Vighneshwara Enterprises** 🏢
*Complete Business Management Solution*