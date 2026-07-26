process.env.DATABASE_URL = 'libsql://ftf-akashbaaniapp-code.aws-ap-south-1.turso.io'
process.env.DATABASE_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUwNDM5MjgsImlkIjoiMDE5ZjljZDYtODIwMS03OGNmLTg2NGMtMjE0MDJiZGQ2NWFhIiwia2lkIjoiQ0ljRVBaVzJPanRsT0w1XzNmY2tYUkVBT2NaYS1RRk5TdXBqaHhfM01zWSIsInJpZCI6IjNiNDI2ZGUyLTAzNDEtNGQwZS04MDAzLTAwOTVhNzgwMTU1OCJ9.JrQGtYM1GFjCmmpGmrYU6EXeZPSxj6FcQt-fMFVU4QTBG9ssqOVRqjfCxWNeGMcyJiz5byJgShA-c7cNZ7WAAQ'

const { db } = await import('../src/lib/db')

console.log('=== db.user.count() ===')
const count = await db.user.count()
console.log('Count:', count)

console.log('\n=== db.user.findUnique({ where: { username: "admin" } }) ===')
const user = await db.user.findUnique({ where: { username: 'admin' } })
console.log('User:', user ? { id: user.id, username: user.username, name: user.name } : 'null')

console.log('\n=== db.uoM.findMany() ===')
const uoms = await db.uoM.findMany()
console.log('UoMs:', uoms)

console.log('\n=== db.customer.findMany() ===')
const customers = await db.customer.findMany()
console.log('Customers:', customers)

console.log('\n=== db.salesOrder.aggregate({ _sum: { grandTotal: true } }) ===')
const agg = await db.salesOrder.aggregate({ _sum: { grandTotal: true } })
console.log('Aggregate:', agg)

console.log('\n=== db.salesOrder.findMany({ include: { customer: true, items: true } }) ===')
const orders = await db.salesOrder.findMany({ include: { customer: true, items: true } })
console.log('Orders:', orders.length, 'first:', orders[0])

console.log('\nSUCCESS!')
process.exit(0)
