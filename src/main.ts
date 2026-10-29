import {getBooleanInput, getInput, setFailed, setOutput} from '@actions/core'
import {existsSync, readFileSync} from 'node:fs'
import {createAscClient, makeJwt, normalizePem} from './asc'
import {bumpMarketingVersion} from './bump'
import {readVersionFile, resolvePath, resolvePlatform} from './config'

async function run(): Promise<void> {
  try {
    await main()
  } catch (err) {
    setFailed(err instanceof Error ? err.message : String(err))
  }
}

async function main(): Promise<void> {
  const issuerId = getInput('issuer-id', {required: true})
  const apiKeyId = getInput('api-key-id', {required: true})
  const apiPrivateKey = normalizePem(
    getInput('api-private-key', {required: true})
  )
  const versionFile = getInput('version-file') || 'Config/Shared.xcconfig'
  const skipEnvFile = getInput('skip-env-file')
  const releaseNotesRoot = getInput('release-notes-root') || 'release-notes'
  const platformInput = getInput('platform')
  const platformFile = getInput('platform-file')
  const dryRun = getBooleanInput('dry-run')

  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
  const shared = readVersionFile(workspace, versionFile)
  const platform = resolvePlatform(workspace, platformInput, platformFile)
  const notesRoot = resolvePath(workspace, releaseNotesRoot)

  let skipPath = ''
  let skipContents = ''
  if (skipEnvFile.trim()) {
    skipPath = resolvePath(workspace, skipEnvFile)
    if (!existsSync(skipPath)) {
      throw new Error(`skip-env-file set but missing: ${skipEnvFile}`)
    }
    skipContents = readFileSync(skipPath, 'utf8')
  } else {
    const defaultSkip = resolvePath(workspace, 'ios/Skip.env')
    if (existsSync(defaultSkip)) {
      skipPath = defaultSkip
      skipContents = readFileSync(defaultSkip, 'utf8')
    }
  }

  const token = makeJwt(apiKeyId, issuerId, apiPrivateKey)
  const client = createAscClient(token)
  const result = await bumpMarketingVersion({
    client,
    bundleId: shared.bundleId,
    version: shared.version,
    platform,
    sharedPath: shared.path,
    sharedContents: shared.contents,
    skipPath,
    skipContents,
    notesRoot,
    workspace,
    dryRun
  })

  setOutput('bumped', result.bumped ? 'true' : 'false')
  if (result.bumped) {
    setOutput('old-version', result.oldVersion)
    setOutput('new-version', result.newVersion)
  }
}

run()
