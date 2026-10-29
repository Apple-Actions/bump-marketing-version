import {info} from '@actions/core'
import {writeFileSync} from 'node:fs'
import {AscClient, AscVersion, findApp, versionState} from './asc'
import {ensureNotesDir, moveUnreleasedNotes} from './notes'
import {compareVersions, nextMinor, replaceMarketingVersion} from './version'

const RELEASED = new Set(['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'])

function emit(msg: string): void {
  info(msg)
}

function isReleased(v: AscVersion): boolean {
  const attrs = v.attributes || {}
  const state = attrs.appVersionState || attrs.appStoreState || ''
  return RELEASED.has(state)
}

async function listAppStoreVersions(
  client: AscClient,
  appId: string,
  platform: string
): Promise<AscVersion[]> {
  const versions: AscVersion[] = []
  let pathName: string | null = `/v1/apps/${appId}/appStoreVersions`
  let query: Record<string, string> | null = {
    'filter[platform]': platform,
    limit: '200'
  }
  while (pathName) {
    const page = (await client.request(
      'GET',
      pathName,
      query ? {query} : undefined
    )) as {data?: AscVersion[]; links?: {next?: string}}
    versions.push(...(page.data || []))
    const next = page.links && page.links.next
    if (!next) {
      break
    }
    pathName = next
    query = null
  }
  return versions
}

export type BumpResult = {
  bumped: boolean
  oldVersion: string
  newVersion: string
}

export async function bumpMarketingVersion({
  client,
  bundleId,
  version,
  platform,
  sharedPath,
  sharedContents,
  skipPath,
  skipContents,
  notesRoot,
  workspace,
  dryRun
}: {
  client: AscClient
  bundleId: string
  version: string
  platform: string
  sharedPath: string
  sharedContents: string
  skipPath: string
  skipContents: string
  notesRoot: string
  workspace: string
  dryRun: boolean
}): Promise<BumpResult> {
  const app = await findApp(client, bundleId)
  emit(`App: ${app.attributes.name} (${app.id})`)
  emit(`Repo MARKETING_VERSION: ${version} (${platform})`)

  const allVersions = await listAppStoreVersions(client, app.id, platform)
  const live = allVersions.filter(isReleased)
  if (!live.length) {
    const sample = allVersions
      .slice(0, 8)
      .map(v => {
        const attrs = v.attributes || {}
        const state = attrs.appVersionState || attrs.appStoreState || ''
        return `${attrs.versionString}=${state}`
      })
      .join(', ')
    emit(
      sample
        ? `No live App Store version on ${platform} yet (${sample}). No bump.`
        : `No App Store versions on ${platform}. No bump.`
    )
    return {bumped: false, oldVersion: version, newVersion: version}
  }

  live.sort((a, b) =>
    compareVersions(
      a.attributes.versionString || '',
      b.attributes.versionString || ''
    )
  )
  const latestLive = live[live.length - 1]
  const latest = latestLive.attributes.versionString || ''
  const latestState = versionState(latestLive)
  const target = nextMinor(latest)
  emit(`ASC latest live: ${latest} (${latestState}) → target Shared ${target}`)

  if (version === target) {
    emit(`Shared already ${target} (one minor past live). No bump.`)
    return {bumped: false, oldVersion: version, newVersion: version}
  }

  emit(`Aligning MARKETING_VERSION ${version} → ${target}`)
  if (dryRun) {
    emit(
      `Dry run: would update ${sharedPath}${skipPath ? ` and ${skipPath}` : ''}`
    )
    return {bumped: false, oldVersion: version, newVersion: target}
  }

  writeFileSync(sharedPath, replaceMarketingVersion(sharedContents, target))
  emit(`Updated ${sharedPath}`)
  if (skipPath) {
    writeFileSync(skipPath, replaceMarketingVersion(skipContents, target))
    emit(`Updated ${skipPath}`)
  }

  ensureNotesDir(notesRoot, target)
  moveUnreleasedNotes(workspace, notesRoot, version, target)
  emit(`Bumped MARKETING_VERSION ${version} → ${target}`)
  return {bumped: true, oldVersion: version, newVersion: target}
}
