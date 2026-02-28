import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const WHISPER_COST_PER_MINUTE = 0.006
const GPT4O_INPUT_PER_TOKEN   = 0.0000025
const GPT4O_OUTPUT_PER_TOKEN  = 0.00001

const users = [
  { id: 'cmm0qdkcg0000bp0wqq83t7qw', name: 'Ron S',          active: 9 },
  { id: 'cmm0pp4zw0000zn3c0hyq5dsa', name: 'Dillon Andrews', active: 5 },
]

const projects = [
  '43rd Avenue 7-Eleven',
  '32nd Street Retail',
  'Pinnacle Peak Medical',
  'Camelback Multi-Family',
  'Scottsdale Office Build',
]

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000 - Math.random() * 36000000)
}

function whisperEntry(userId: string, project: string, daysBack: number) {
  // Typical voice memo: 1–8 MB
  const fileSizeBytes = Math.round(randomBetween(800_000, 8_000_000))
  const estimatedMinutes = fileSizeBytes / (1024 * 1024)
  const costUsd = new Prisma.Decimal(estimatedMinutes * WHISPER_COST_PER_MINUTE)

  return {
    userId,
    service: 'whisper',
    action: 'transcribe',
    fileSizeBytes,
    costUsd,
    projectName: project,
    createdAt: daysAgo(daysBack),
  }
}

function gpt4oEntry(userId: string, project: string, daysBack: number) {
  // Typical structuring call
  const inputTokens  = Math.round(randomBetween(400, 1200))
  const outputTokens = Math.round(randomBetween(300, 800))
  const costUsd = new Prisma.Decimal(
    inputTokens * GPT4O_INPUT_PER_TOKEN + outputTokens * GPT4O_OUTPUT_PER_TOKEN
  )

  return {
    userId,
    service: 'gpt4o',
    action: 'structure',
    inputTokens,
    outputTokens,
    costUsd,
    projectName: project,
    createdAt: daysAgo(daysBack),
  }
}

async function main() {
  const entries: any[] = []

  // Generate realistic activity over the last 30 days
  for (const user of users) {
    // More activity on recent days, less earlier
    for (let day = 0; day < 30; day++) {
      // Probability of activity on this day (higher for recent days)
      const activityChance = user.active / 10 * (1 - day / 40)
      if (Math.random() > activityChance) continue

      // 1-3 logs per active day
      const logsToday = Math.ceil(randomBetween(1, 3))
      const project = projects[Math.floor(Math.random() * projects.length)]

      for (let i = 0; i < logsToday; i++) {
        // Each log: one whisper call + one GPT-4o call
        entries.push(whisperEntry(user.id, project, day))
        entries.push(gpt4oEntry(user.id, project, day))
      }
    }
  }

  console.log(`Seeding ${entries.length} API usage log entries...`)
  await prisma.apiUsageLog.createMany({ data: entries })

  // Summary
  const whisperCount = entries.filter(e => e.service === 'whisper').length
  const gpt4oCount   = entries.filter(e => e.service === 'gpt4o').length
  const totalCost    = entries.reduce((s, e) => s + Number(e.costUsd), 0)

  console.log(`  Whisper calls: ${whisperCount}`)
  console.log(`  GPT-4o calls:  ${gpt4oCount}`)
  console.log(`  Total cost:    $${totalCost.toFixed(4)}`)
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
