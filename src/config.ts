import {existsSync, readFileSync} from 'node:fs'
import {isAbsolute, join} from 'node:path'

function parseXcconfig(contents: string): {
  version: string
  bundleId: string
} {
  let version = ''
  let bundleId = ''
  for (const line of contents.split(/\r?\n/)) {
    const versionMatch = /^MARKETING_VERSION\s*=\s*(.*)$/.exec(line)
    if (versionMatch) {
      version = versionMatch[1].trim()
    }
    const bundleMatch = /^PRODUCT_BUNDLE_IDENTIFIER\s*=\s*(.*)$/.exec(line)
    if (bundleMatch) {
      bundleId = bundleMatch[1].trim()
    }
  }
  return {version, bundleId}
}

function readFirstValue(contents: string): string {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    return trimmed.replace(/\s+/g, '')
  }
  return ''
}

export function resolvePath(workspace: string, relativePath: string): string {
  return isAbsolute(relativePath) ? relativePath : join(workspace, relativePath)
}

export function readVersionFile(
  workspace: string,
  versionFile: string
): {path: string; version: string; bundleId: string; contents: string} {
  const path = resolvePath(workspace, versionFile)
  if (!existsSync(path)) {
    throw new Error(`Missing ${versionFile}`)
  }
  const contents = readFileSync(path, 'utf8')
  const {version, bundleId} = parseXcconfig(contents)
  if (!version || !bundleId) {
    throw new Error(
      `Could not parse MARKETING_VERSION / PRODUCT_BUNDLE_IDENTIFIER from ${versionFile}`
    )
  }
  return {path, version, bundleId, contents}
}

export function resolvePlatform(
  workspace: string,
  platformInput: string,
  platformFile: string
): string {
  if (platformInput.trim()) {
    return platformInput.trim()
  }
  if (platformFile.trim()) {
    const path = resolvePath(workspace, platformFile)
    if (existsSync(path)) {
      const value = readFirstValue(readFileSync(path, 'utf8'))
      if (value) {
        return value
      }
    }
  }
  return 'IOS'
}
