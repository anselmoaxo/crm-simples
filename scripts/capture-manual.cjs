const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.docs')
const outputDir = path.join(root, 'docs', 'assets')

function readEnv(filePath) {
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=')
        const key = line.slice(0, separator).trim()
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
        return [key, value]
      }),
  )
}

async function capture(page, route, fileName, heading, selector) {
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  if (heading) await page.getByRole('heading', { name: heading }).first().waitFor()
  await page.waitForTimeout(3000)
  const screenshotPath = path.join(outputDir, fileName)
  if (selector) {
    await page.locator(selector).screenshot({ path: screenshotPath })
  } else {
    await page.screenshot({ path: screenshotPath, fullPage: true })
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'pt-BR',
    colorScheme: 'light',
  })
  const page = await context.newPage()

  await capture(page, '/login', '01-login.png', 'Entrar', '.max-w-sm')
  await capture(page, '/cadastro', '00-cadastro.png', 'Criar conta', '.max-w-sm')

  const env = readEnv(envPath)
  if (!env.DOCS_TEST_EMAIL || !env.DOCS_TEST_PASSWORD) {
    await browser.close()
    throw new Error('.env.docs deve definir DOCS_TEST_EMAIL e DOCS_TEST_PASSWORD')
  }

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.getByLabel('E-mail').fill(env.DOCS_TEST_EMAIL)
  await page.getByLabel('Senha').fill(env.DOCS_TEST_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 })

  if (page.url().endsWith('/onboarding')) {
    throw new Error('A conta de documentação ainda não concluiu o onboarding')
  }

  await capture(page, '/dashboard', '02-dashboard.png', 'Dashboard')
  await capture(page, '/clientes', '03-clientes.png', 'Clientes')
  await capture(page, '/clientes?acao=novo', '04-novo-cliente.png', 'Clientes')
  await page.keyboard.press('Escape')
  await capture(page, '/oportunidades', '05-oportunidades.png', 'Oportunidades')
  await capture(page, '/atividades', '06-atividades.png', 'Atividades')

  const optionalPages = [
    ['/relatorios', '07-relatorios.png', 'Relatórios'],
    ['/equipe', '08-equipe.png', 'Equipe'],
    ['/configuracoes/funil', '09-funil.png', 'Funil de Vendas'],
    ['/configuracoes', '10-configuracoes.png', 'Configurações'],
  ]

  for (const [route, fileName, heading] of optionalPages) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    if (new URL(page.url()).pathname === route) {
      await page.getByRole('heading', { name: heading }).first().waitFor()
      await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true })
    }
  }

  await browser.close()
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
