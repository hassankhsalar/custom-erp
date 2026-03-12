import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully!')
    
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query successful:', result)
    
  } catch (error) {
    console.error('❌ Connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()