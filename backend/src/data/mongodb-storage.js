// MongoDB-based data storage for permanent data persistence
import mongoose from 'mongoose';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://balayyaj05_db_user:CvzMIAlHI40cGLFQ@cluster0.03sgflx.mongodb.net/vighneshwara?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Define Schemas
const vehicleSchema = new mongoose.Schema({
  vehicleNumber: String,
  vehicleType: String,
  driverName: String,
  driverPhone: String,
  capacity: Number,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const vehicleTransactionSchema = new mongoose.Schema({
  vehicleId: Number,
  vehicleName: String,
  type: String, // 'income' or 'expense'
  description: String,
  amount: String,
  date: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const scrapSchema = new mongoose.Schema({
  item: String,
  itemName: String,
  category: String,
  weight: String,
  rate: String,
  pricePerKg: Number,
  total: Number,
  totalAmount: Number,
  customerName: String,
  customerPhone: String,
  date: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const expenseSchema = new mongoose.Schema({
  description: String,
  category: String,
  amount: String,
  paymentMethod: String,
  vehicleNumber: String,
  date: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const billSchema = new mongoose.Schema({
  billNumber: String,
  customerName: String,
  customerPhone: String,
  customerAddress: String,
  items: String,
  amount: Number,
  paymentStatus: { type: String, default: 'pending' },
  paymentMethod: String,
  date: String,
  dueDate: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

// Create Models
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const VehicleTransaction = mongoose.model('VehicleTransaction', vehicleTransactionSchema);
const Scrap = mongoose.model('Scrap', scrapSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Bill = mongoose.model('Bill', billSchema);

// Storage class with MongoDB operations
class MongoDBStorage {
  constructor() {
    this.models = {
      vehicles: Vehicle,
      vehicleTransactions: VehicleTransaction,
      scrap: Scrap,
      expenses: Expense,
      bills: Bill
    };
  }

  // Generic CRUD operations
  async create(collection, data) {
    const Model = this.models[collection];
    if (!Model) throw new Error(`Unknown collection: ${collection}`);
    
    const doc = new Model({
      ...data,
      createdAt: new Date()
    });
    await doc.save();
    return { ...doc.toObject(), id: doc._id };
  }

  async findAll(collection) {
    const Model = this.models[collection];
    if (!Model) return [];
    
    const docs = await Model.find().sort({ createdAt: -1 });
    return docs.map(doc => ({ ...doc.toObject(), id: doc._id }));
  }

  async findById(collection, id) {
    const Model = this.models[collection];
    if (!Model) return null;
    
    try {
      const doc = await Model.findById(id);
      return doc ? { ...doc.toObject(), id: doc._id } : null;
    } catch (err) {
      return null;
    }
  }

  async update(collection, id, data) {
    const Model = this.models[collection];
    if (!Model) return null;
    
    try {
      const doc = await Model.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true }
      );
      return doc ? { ...doc.toObject(), id: doc._id } : null;
    } catch (err) {
      return null;
    }
  }

  async delete(collection, id) {
    const Model = this.models[collection];
    if (!Model) return false;
    
    try {
      const result = await Model.findByIdAndDelete(id);
      return !!result;
    } catch (err) {
      return false;
    }
  }

  // No-op methods for compatibility
  loadData() {
    console.log('📂 Using MongoDB Atlas for data storage');
  }

  saveData() {
    // MongoDB auto-saves, no action needed
  }
}

// Create singleton instance
const storage = new MongoDBStorage();

export default storage;
