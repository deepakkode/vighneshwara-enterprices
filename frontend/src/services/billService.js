import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { db } from './firebase'

class BillService {
  constructor() {
    this.collectionName = 'bills'
    this.collection = collection(db, this.collectionName)
  }

  // Create a new bill
  async createBill(billData) {
    try {
      const docData = {
        ...billData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        clientTimestamp: Date.now()
      }
      
      const docRef = await addDoc(this.collection, docData)
      return { id: docRef.id, ...docData }
    } catch (error) {
      console.error('Error creating bill:', error)
      throw error
    }
  }

  // Update an existing bill
  async updateBill(billId, billData) {
    try {
      const docRef = doc(db, this.collectionName, billId)
      const updateData = {
        ...billData,
        updatedAt: serverTimestamp(),
        clientTimestamp: Date.now()
      }
      
      await updateDoc(docRef, updateData)
      return { id: billId, ...updateData }
    } catch (error) {
      console.error('Error updating bill:', error)
      throw error
    }
  }

  // Delete a bill
  async deleteBill(billId) {
    try {
      const docRef = doc(db, this.collectionName, billId)
      await deleteDoc(docRef)
      return billId
    } catch (error) {
      console.error('Error deleting bill:', error)
      throw error
    }
  }

  // Get all bills (one-time fetch)
  async getAllBills() {
    try {
      const q = query(this.collection, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to JavaScript dates
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
        billDate: doc.data().billDate ? new Date(doc.data().billDate) : new Date()
      }))
    } catch (error) {
      console.error('Error fetching bills:', error)
      throw error
    }
  }

  // Get bills by type
  async getBillsByType(type) {
    try {
      const q = query(
        this.collection, 
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
        billDate: doc.data().billDate ? new Date(doc.data().billDate) : new Date()
      }))
    } catch (error) {
      console.error('Error fetching bills by type:', error)
      throw error
    }
  }

  // Subscribe to real-time bill updates
  subscribeToBills(callback) {
    try {
      const q = query(this.collection, orderBy('createdAt', 'desc'))
      
      return onSnapshot(q, (querySnapshot) => {
        const bills = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to JavaScript dates
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
          billDate: doc.data().billDate ? new Date(doc.data().billDate) : new Date()
        }))
        
        callback(bills)
      }, (error) => {
        console.error('Error in bills subscription:', error)
        callback([])
      })
    } catch (error) {
      console.error('Error setting up bills subscription:', error)
      return () => {} // Return empty unsubscribe function
    }
  }

  // Subscribe to bills by type
  subscribeToBillsByType(type, callback) {
    try {
      const q = query(
        this.collection, 
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      )
      
      return onSnapshot(q, (querySnapshot) => {
        const bills = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
          billDate: doc.data().billDate ? new Date(doc.data().billDate) : new Date()
        }))
        
        callback(bills)
      }, (error) => {
        console.error('Error in bills by type subscription:', error)
        callback([])
      })
    } catch (error) {
      console.error('Error setting up bills by type subscription:', error)
      return () => {}
    }
  }

  // Get bill analytics
  async getBillAnalytics() {
    try {
      const bills = await this.getAllBills()
      
      const analytics = {
        totalBills: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0),
        purchaseVouchers: bills.filter(bill => bill.type === 'PURCHASE_VOUCHER').length,
        taxInvoices: bills.filter(bill => bill.type === 'TAX_INVOICE').length,
        monthlyData: this.calculateMonthlyData(bills),
        recentBills: bills.slice(0, 5)
      }
      
      return analytics
    } catch (error) {
      console.error('Error calculating bill analytics:', error)
      throw error
    }
  }

  // Calculate monthly bill data
  calculateMonthlyData(bills) {
    const monthlyData = {}
    
    bills.forEach(bill => {
      const month = new Date(bill.billDate).toISOString().slice(0, 7) // YYYY-MM format
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          count: 0,
          totalAmount: 0,
          purchaseVouchers: 0,
          taxInvoices: 0
        }
      }
      
      monthlyData[month].count++
      monthlyData[month].totalAmount += bill.grandTotal || 0
      
      if (bill.type === 'PURCHASE_VOUCHER') {
        monthlyData[month].purchaseVouchers++
      } else if (bill.type === 'TAX_INVOICE') {
        monthlyData[month].taxInvoices++
      }
    })
    
    return monthlyData
  }
}

// Export singleton instance
export const billService = new BillService()
export default billService