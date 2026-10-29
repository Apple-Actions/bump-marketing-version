import {info} from '@actions/core'
import {execFileSync} from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  writeFileSync
} from 'node:fs'
import {join, relative} from 'node:path'

function latestTagForVersion(workspace: string, version: string): string {
  try {
    const out = execFileSync(
      'git',
      ['tag', '-l', `v${version}-*`, '--sort=-v:refname'],
      {cwd: workspace, encoding: 'utf8'}
    )
    return (
      out
        .split('\n')
        .map(s => s.trim())
        .find(Boolean) || ''
    )
  } catch {
    return ''
  }
}

function pathInTag(workspace: string, tag: string, filePath: string): boolean {
  if (!tag) {
    return false
  }
  try {
    execFileSync('git', ['cat-file', '-e', `${tag}:${filePath}`], {
      cwd: workspace,
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

export function ensureNotesDir(notesRoot: string, version: string): string {
  const notesDir = join(notesRoot, version)
  const keep = join(notesDir, '.gitkeep')
  if (!existsSync(keep)) {
    mkdirSync(notesDir, {recursive: true})
    writeFileSync(keep, '')
    info(`Created ${keep}`)
  }
  return notesDir
}

/** Move unreleased *.md notes from oldVersion → newVersion when not in the old tag. */
export function moveUnreleasedNotes(
  workspace: string,
  notesRoot: string,
  oldVersion: string,
  newVersion: string
): void {
  const oldDir = join(notesRoot, oldVersion)
  const newDir = join(notesRoot, newVersion)
  if (!existsSync(oldDir)) {
    return
  }
  mkdirSync(newDir, {recursive: true})
  const tag = latestTagForVersion(workspace, oldVersion)
  const names = readdirSync(oldDir)
    .filter(n => n.endsWith('.md'))
    .sort()
  for (const name of names) {
    const from = join(oldDir, name)
    const rel = join('release-notes', oldVersion, name).replace(/\\/g, '/')
    const repoRel = relative(workspace, from).replace(/\\/g, '/')
    if (pathInTag(workspace, tag, repoRel) || pathInTag(workspace, tag, rel)) {
      continue
    }
    const to = join(newDir, name)
    if (existsSync(to)) {
      info(`Skip move ${repoRel}: ${to} already exists`)
      continue
    }
    try {
      execFileSync('git', ['mv', from, to], {cwd: workspace})
      info(`Moved unreleased note ${repoRel} → ${relative(workspace, to)}`)
    } catch {
      renameSync(from, to)
      info(
        `Moved unreleased note ${repoRel} → ${relative(workspace, to)} (filesystem)`
      )
    }
  }
}
