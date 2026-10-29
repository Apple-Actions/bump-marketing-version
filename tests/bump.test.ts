import {describe, expect, it, vi} from 'vitest'
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {bumpMarketingVersion} from '../src/bump'
import type {AscClient} from '../src/asc'

describe('bumpMarketingVersion', () => {
  it('no-ops when Shared is already one minor past live', async () => {
    const request = vi.fn(async (method: string, path: string) => {
      if (path === '/v1/apps') {
        return {
          data: [
            {
              id: 'app-1',
              attributes: {name: 'Example', bundleId: 'com.example'}
            }
          ]
        }
      }
      if (path.includes('/appStoreVersions')) {
        return {
          data: [
            {
              id: 'v1',
              attributes: {
                versionString: '1.0',
                appVersionState: 'READY_FOR_DISTRIBUTION'
              }
            }
          ]
        }
      }
      throw new Error(`unexpected ${method} ${path}`)
    })

    const result = await bumpMarketingVersion({
      client: {request} as AscClient,
      bundleId: 'com.example',
      version: '1.1',
      platform: 'IOS',
      sharedPath: '/tmp/Shared.xcconfig',
      sharedContents: 'MARKETING_VERSION = 1.1\n',
      skipPath: '',
      skipContents: '',
      notesRoot: '/tmp/notes',
      workspace: '/tmp',
      dryRun: false
    })
    expect(result.bumped).toBe(false)
  })

  it('writes the bumped marketing version', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'bump-mkt-'))
    const sharedPath = join(workspace, 'Shared.xcconfig')
    writeFileSync(
      sharedPath,
      'MARKETING_VERSION = 1.0\nPRODUCT_BUNDLE_IDENTIFIER = com.example\n'
    )
    const notesRoot = join(workspace, 'release-notes')
    mkdirSync(notesRoot, {recursive: true})

    const request = vi.fn(async (method: string, path: string) => {
      if (path === '/v1/apps') {
        return {
          data: [
            {
              id: 'app-1',
              attributes: {name: 'Example', bundleId: 'com.example'}
            }
          ]
        }
      }
      if (path.includes('/appStoreVersions')) {
        return {
          data: [
            {
              id: 'v1',
              attributes: {
                versionString: '1.0',
                appVersionState: 'READY_FOR_DISTRIBUTION'
              }
            }
          ]
        }
      }
      throw new Error(`unexpected ${method} ${path}`)
    })

    const result = await bumpMarketingVersion({
      client: {request} as AscClient,
      bundleId: 'com.example',
      version: '1.0',
      platform: 'IOS',
      sharedPath,
      sharedContents: readFileSync(sharedPath, 'utf8'),
      skipPath: '',
      skipContents: '',
      notesRoot,
      workspace,
      dryRun: false
    })

    expect(result).toEqual({
      bumped: true,
      oldVersion: '1.0',
      newVersion: '1.1'
    })
    expect(readFileSync(sharedPath, 'utf8')).toContain(
      'MARKETING_VERSION = 1.1'
    )
  })
})
