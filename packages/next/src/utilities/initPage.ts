import { headers as getHeaders } from 'next/headers'
import qs from 'qs'

import { auth } from './auth'

import { getPayload } from 'payload'
import type {
  SanitizedCollectionConfig,
  SanitizedConfig,
  SanitizedGlobalConfig,
} from 'payload/types'
import { redirect } from 'next/navigation'
import { Permissions, parseCookies } from 'payload/auth'
import { getRequestLanguage } from './getRequestLanguage'
import { findLocaleFromCode } from '../../../ui/src/utilities/findLocaleFromCode'
import type { I18n } from '@payloadcms/translations'
import { translations } from '@payloadcms/translations/all'
import { initI18n } from '@payloadcms/translations'

export const initPage = async ({
  config: configPromise,
  redirectUnauthenticatedUser = false,
  collectionSlug,
  globalSlug,
  localeParam,
  searchParams,
  route,
}: {
  config: SanitizedConfig | Promise<SanitizedConfig>
  redirectUnauthenticatedUser?: boolean
  collectionSlug?: string
  globalSlug?: string
  localeParam?: string
  searchParams?: { [key: string]: string | string[] | undefined }
  route?: string
}): Promise<{
  payload: Awaited<ReturnType<typeof getPayload>>
  permissions: Permissions
  user: Awaited<ReturnType<typeof auth>>['user']
  config: SanitizedConfig
  i18n: I18n
  collectionConfig?: SanitizedCollectionConfig
  globalConfig?: SanitizedGlobalConfig
  locale: ReturnType<typeof findLocaleFromCode>
}> => {
  const headers = getHeaders()
  const cookies = parseCookies(headers)

  const { permissions, user } = await auth({
    headers,
    config: configPromise,
    cookies,
  })

  const language = getRequestLanguage({ cookies, headers })

  const config = await configPromise

  const { localization, routes, collections, globals } = config

  if (redirectUnauthenticatedUser && !user && route !== '/login') {
    const stringifiedSearchParams = Object.keys(searchParams ?? {}).length
      ? `?${qs.stringify(searchParams)}`
      : ''

    redirect(`${routes.admin}/login?redirect=${routes.admin + route + stringifiedSearchParams}`)
  }

  const payload = await getPayload({
    config,
  })

  const i18n = await initI18n({
    config: config.i18n,
    language,
    translations,
    context: 'all',
  })
  let collectionConfig: SanitizedCollectionConfig
  let globalConfig: SanitizedGlobalConfig

  if (collectionSlug) {
    collectionConfig = collections.find((collection) => collection.slug === collectionSlug)
  }

  if (globalSlug) {
    globalConfig = globals.find((global) => global.slug === globalSlug)
  }

  const defaultLocale =
    localization && localization.defaultLocale ? localization.defaultLocale : 'en'

  const localeCode = localeParam || defaultLocale

  const locale = localization && findLocaleFromCode(localization, localeCode)

  return {
    payload,
    permissions,
    user,
    config,
    i18n,
    collectionConfig,
    globalConfig,
    locale,
  }
}
