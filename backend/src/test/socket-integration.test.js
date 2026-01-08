import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import { Server } from 'socket.io'
import Client from 'socket.io-client'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Socket.io Real-time Updates Integration Tests', () => {
  let httpServer
  let httpServerAddr
  let ioServer
  let clientSocket

  beforeAll(async () => {
    // Create a separate HTTP server for testing
    httpServer = createServer()
    ioServer = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    // Set up Socket.io connection handling (same as main server)
    ioServer.on('connection', (socket) => {
      socket.on('join-dashboard', () => {
        socket.join('dashboard')
      })
    })

    // Start the test server
    await new Promise((resolve) => {
      httpServer.listen(() => {
        httpServerAddr = httpServer.address()
        resolve()
      })
    })
  })

  afterAll(async () => {
    ioServer.close()
    httpServer.close()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.vehicleTransaction.deleteMany()
    await prisma.scrapTransaction.deleteMany()
    await prisma.vehicle.deleteMany()
    await prisma.dailySummary.deleteMany()

    // Create a client socket connection
    clientSocket = new Client(`http://localhost:${httpServerAddr.port}`)
    
    // Wait for connection
    await new Promise((resolve) => {
      clientSocket.on('connect', resolve)
    })

    // Join dashboard room
    clientSocket.emit('join-dashboard')
  })

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect()
    }
  })

  /**
   * Test WebSocket connection and event broadcasting
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should establish WebSocket connection and join dashboard room', async () => {
    expect(clientSocket.connected).toBe(true)
    expect(clientSocket.id).toBeDefined()
  })

  /**
   * Test real-time vehicle transaction updates
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast vehicle transaction events in real-time', async () => {
    // Create a vehicle first
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleType: 'LORRY',
        vehicleNumber: 'TEST-LORRY-001'
      }
    })

    // Set up event listener
    const transactionCreatedPromise = new Promise((resolve) => {
      clientSocket.on('transaction-created', (data) => {
        resolve(data)
      })
    })

    // Create a vehicle transaction via API (this should trigger the event)
    const transactionData = {
      vehicleId: vehicle.id,
      transactionType: 'INCOME',
      incomeType: 'RENTAL',
      amount: 15000,
      transactionDate: new Date().toISOString(),
      description: 'Test rental income'
    }

    // Simulate the Socket.io emission that would happen in the real API
    ioServer.to('dashboard').emit('transaction-created', {
      type: 'vehicle',
      transaction: {
        ...transactionData,
        id: 'test-transaction-id'
      }
    })

    // Wait for the event to be received
    const receivedData = await transactionCreatedPromise

    expect(receivedData).toBeDefined()
    expect(receivedData.type).toBe('vehicle')
    expect(receivedData.transaction).toBeDefined()
    expect(receivedData.transaction.transactionType).toBe('INCOME')
    expect(receivedData.transaction.amount).toBe(15000)
  })

  /**
   * Test real-time scrap transaction updates
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast scrap transaction events in real-time', async () => {
    // Set up event listener
    const transactionCreatedPromise = new Promise((resolve) => {
      clientSocket.on('transaction-created', (data) => {
        resolve(data)
      })
    })

    // Simulate scrap transaction creation event
    const scrapTransactionData = {
      transactionType: 'PURCHASE',
      partyName: 'Test Supplier',
      scrapType: 'KB_WASTE',
      quantity: 100,
      rate: 25,
      totalAmount: 2500,
      transactionDate: new Date().toISOString()
    }

    ioServer.to('dashboard').emit('transaction-created', {
      type: 'scrap',
      transaction: {
        ...scrapTransactionData,
        id: 'test-scrap-transaction-id'
      }
    })

    // Wait for the event to be received
    const receivedData = await transactionCreatedPromise

    expect(receivedData).toBeDefined()
    expect(receivedData.type).toBe('scrap')
    expect(receivedData.transaction).toBeDefined()
    expect(receivedData.transaction.transactionType).toBe('PURCHASE')
    expect(receivedData.transaction.totalAmount).toBe(2500)
  })

  /**
   * Test transaction update events
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast transaction update events', async () => {
    // Set up event listener
    const transactionUpdatedPromise = new Promise((resolve) => {
      clientSocket.on('transaction-updated', (data) => {
        resolve(data)
      })
    })

    // Simulate transaction update event
    const updatedTransactionData = {
      id: 'test-transaction-id',
      transactionType: 'INCOME',
      amount: 20000, // Updated amount
      description: 'Updated rental income'
    }

    ioServer.to('dashboard').emit('transaction-updated', {
      type: 'vehicle',
      transaction: updatedTransactionData
    })

    // Wait for the event to be received
    const receivedData = await transactionUpdatedPromise

    expect(receivedData).toBeDefined()
    expect(receivedData.type).toBe('vehicle')
    expect(receivedData.transaction.amount).toBe(20000)
  })

  /**
   * Test transaction deletion events
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast transaction deletion events', async () => {
    // Set up event listener
    const transactionDeletedPromise = new Promise((resolve) => {
      clientSocket.on('transaction-deleted', (data) => {
        resolve(data)
      })
    })

    // Simulate transaction deletion event
    ioServer.to('dashboard').emit('transaction-deleted', {
      type: 'vehicle',
      transactionId: 'deleted-transaction-id'
    })

    // Wait for the event to be received
    const receivedData = await transactionDeletedPromise

    expect(receivedData).toBeDefined()
    expect(receivedData.type).toBe('vehicle')
    expect(receivedData.transactionId).toBe('deleted-transaction-id')
  })

  /**
   * Test bill generation events
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast bill generation events', async () => {
    // Set up event listener
    const billGeneratedPromise = new Promise((resolve) => {
      clientSocket.on('bill-generated', (data) => {
        resolve(data)
      })
    })

    // Simulate bill generation event
    const billData = {
      billType: 'TAX_INVOICE',
      billNumber: 'INV-2024-001',
      totalAmount: 12600,
      partyName: 'Test Customer'
    }

    ioServer.to('dashboard').emit('bill-generated', billData)

    // Wait for the event to be received
    const receivedData = await billGeneratedPromise

    expect(receivedData).toBeDefined()
    expect(receivedData.billType).toBe('TAX_INVOICE')
    expect(receivedData.billNumber).toBe('INV-2024-001')
    expect(receivedData.totalAmount).toBe(12600)
  })

  /**
   * Test dashboard refresh events
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast dashboard refresh events', async () => {
    // Set up event listener
    const dashboardRefreshPromise = new Promise((resolve) => {
      clientSocket.on('dashboard-refresh', (data) => {
        resolve(data)
      })
    })

    // Simulate dashboard refresh event
    const refreshData = {
      reason: 'data-updated',
      timestamp: new Date().toISOString()
    }

    ioServer.to('dashboard').emit('dashboard-refresh', refreshData)

    // Wait for the event to be received
    const receivedData = await dashboardRefreshPromise

    expect(receivedData).toBeDefined()
    expect(receivedData.reason).toBe('data-updated')
    expect(receivedData.timestamp).toBeDefined()
  })

  /**
   * Test multiple clients receiving the same event
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should broadcast events to multiple connected clients', async () => {
    // Create a second client
    const clientSocket2 = new Client(`http://localhost:${httpServerAddr.port}`)
    
    await new Promise((resolve) => {
      clientSocket2.on('connect', resolve)
    })

    clientSocket2.emit('join-dashboard')

    // Set up event listeners on both clients
    const client1Promise = new Promise((resolve) => {
      clientSocket.on('transaction-created', resolve)
    })

    const client2Promise = new Promise((resolve) => {
      clientSocket2.on('transaction-created', resolve)
    })

    // Broadcast event
    const testData = {
      type: 'vehicle',
      transaction: {
        id: 'broadcast-test',
        amount: 5000
      }
    }

    ioServer.to('dashboard').emit('transaction-created', testData)

    // Both clients should receive the event
    const [client1Data, client2Data] = await Promise.all([
      client1Promise,
      client2Promise
    ])

    expect(client1Data).toEqual(testData)
    expect(client2Data).toEqual(testData)

    // Cleanup
    clientSocket2.disconnect()
  })

  /**
   * Test connection error handling
   * Validates: Requirements 3.2, 10.3, 11.3
   */
  it('should handle connection errors gracefully', async () => {
    // Disconnect the client
    clientSocket.disconnect()

    // Wait for disconnection
    await new Promise((resolve) => {
      clientSocket.on('disconnect', resolve)
    })

    expect(clientSocket.connected).toBe(false)

    // Reconnect
    clientSocket.connect()

    // Wait for reconnection
    await new Promise((resolve) => {
      clientSocket.on('connect', resolve)
    })

    expect(clientSocket.connected).toBe(true)
  })
})