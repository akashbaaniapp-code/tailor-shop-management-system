import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const url = process.env.DATABASE_URL
const token = process.env.DATABASE_AUTH_TOKEN
console.log('DATABASE_URL:', url ? url.substring(0, 50) : 'NOT SET')
console.log('DATABASE_AUTH_TOKEN set:', !!token)

try {
  const libsql = createClient({ url, authToken: token })
  const adapter = new PrismaLibSql(libsql)
  const prisma = new PrismaClient({ adapter })

  console.log('\nPrisma client created. Testing queries...')
  const count = await prisma.user.count()
  console.log('Count:', count)
  const user = await prisma.user.findUnique({ where: { username: 'admin' } })
  console.log('User:', user ? { id: user.id, username: user.username } : 'null')
  console.log('\nAll Prisma queries work!')
  await prisma.$disconnect()
} catch (err) {
  console.error('\nPrisma error:')
  console.error('Message:', err instanceof Error ? err.message : err)
  console.error('Stack:', err instanceof Error ? err.stack : '')
  process.exit(1)
}
