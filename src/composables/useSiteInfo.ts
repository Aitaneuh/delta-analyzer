import { ref } from 'vue'
import { api } from '@/services/api'

export interface SiteInfo {
  operatorName: string
  operatorAddress: string
  contactEmail: string
  hostingCountry: string
  governingLaw: string
  sourceCodeUrl: string
}

const siteInfo = ref<SiteInfo | null>(null)

/** The operator's details for the legal pages. They're set when the site is deployed. */
export function useSiteInfo() {
  if (!siteInfo.value) {
    api<SiteInfo>('/api/site-info')
      .then((info) => (siteInfo.value = info))
      .catch(() => {})
  }
  return siteInfo
}
