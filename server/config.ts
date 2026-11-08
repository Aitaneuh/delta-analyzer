function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const isProduction = process.env.NODE_ENV === 'production'
const publicUrl = (process.env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/+$/, '')

// In development the legal pages can show placeholders; a public deployment must fill them in.
const legal = (name: string, placeholder: string) =>
  isProduction ? required(name) : process.env[name]?.trim() || placeholder

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  publicUrl,
  isHttps: publicUrl.startsWith('https://'),
  // How many reverse proxies sit in front of the app. Used to read the real visitor IP.
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  lichessUrl: (process.env.LICHESS_URL ?? 'https://lichess.org').replace(/\/+$/, ''),
  lichessClientId: new URL(publicUrl).host,
  site: {
    operatorName: legal('OPERATOR_NAME', '[your full name]'),
    operatorAddress: legal('OPERATOR_ADDRESS', '[your postal address]'),
    contactEmail: legal('CONTACT_EMAIL', '[your contact email]'),
    hostingCountry: legal('HOSTING_COUNTRY', '[country of your server]'),
    governingLaw: legal('GOVERNING_LAW', '[your country]'),
    sourceCodeUrl: legal('SOURCE_CODE_URL', 'https://github.com/Aitaneuh/delta-analyzer'),
  },
}
