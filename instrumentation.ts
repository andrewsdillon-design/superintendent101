import { registerHighlight } from '@highlight-run/next/server'

export async function register() {
  registerHighlight({ projectID: '3', serviceName: 'profieldhub-web' })
}
