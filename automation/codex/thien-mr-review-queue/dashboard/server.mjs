import { createServer } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { mkdir, writeFile } from 'node:fs/promises'

const host = 'https://git.fullscript.io'
const projectPath = 'developers/fs-academy'
const project = encodeURIComponent(projectPath)
const port = Number(process.env.PORT ?? 4177)
const historyPath = '/Users/study/.codex/automations/thien-mr-dashboard-history.json'
const reportPath = '/Users/study/.codex/automations/thien-mr-review-queue-report.json'
const toneMemoryPath = '/Users/study/.codex/automations/thien-mr-dashboard-reply-tone.json'
const automationPath = '/Users/study/.codex/automations/thien-mr-review-queue/automation.toml'
const automationDbPath = '/Users/study/.codex/sqlite/codex-dev.db'
const commentFixPath = '/Users/study/.codex/automations/thien-mr-dashboard-comment-fixes.json'
const cursorBaselinePath = '/Users/study/.codex/automations/thien-mr-cursor-baseline.json'
const workspacePath = '/Users/study/aurora/fs-academy'

async function loadEnvFile(path) {
  try {
    const body = await readFile(path, 'utf8')
    for (const line of body.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  } catch {}
}

await loadEnvFile('.env')
await loadEnvFile('.cursor/scripts/.env')

async function resolveCursorBaseline() {
  const result = await shellWithStatus('npx', [
    'tsx',
    '.cursor/scripts/resolve-automation-cursor-baseline.ts',
    '--checkout',
  ])
  if (!result.ok) {
    console.warn('Cursor baseline resolve failed:', result.stderr || result.stdout)
  }
}

async function readCursorBaseline() {
  try {
    return JSON.parse(await readFile(cursorBaselinePath, 'utf8'))
  } catch {
    return {
      active: false,
      guidanceBranch: 'staging',
      gitUnblockRef: 'origin/staging',
      guidanceRoot: '.cursor',
    }
  }
}

await resolveCursorBaseline()

const token = process.env.GITLAB_TOKEN ?? process.env.NPMRC_GITLAB_TOKEN

async function gitlabJson(path) {
  if (!token) throw new Error('Missing GITLAB_TOKEN or NPMRC_GITLAB_TOKEN')
  const response = await fetch(`${host}/api/v4${path}`, {
    headers: { 'PRIVATE-TOKEN': token },
  })
  if (!response.ok) {
    throw new Error(`GitLab API ${response.status}: ${await response.text()}`)
  }
  return await response.json()
}

async function gitlabRequest(path, options = {}) {
  if (!token) throw new Error('Missing GITLAB_TOKEN or NPMRC_GITLAB_TOKEN')
  const response = await fetch(`${host}/api/v4${path}`, {
    ...options,
    headers: {
      'PRIVATE-TOKEN': token,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`GitLab API ${response.status}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function readJsonBody(request) {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? JSON.parse(body) : {}
}

function reviewLike(body = '') {
  const text = body.trim()
  return (
    text.length >= 320 ||
    /\*\*Verdict:/i.test(text) ||
    /^#{1,6}\s+summary\b/im.test(text) ||
    /\*\*Summary\*\*/i.test(text) ||
    (/\breview\b/i.test(text) && text.length >= 80)
  )
}

function maxTime(items, pick) {
  let max = null
  for (const item of items) {
    const raw = pick(item)
    if (!raw) continue
    const time = Date.parse(raw)
    if (!Number.isNaN(time) && (max === null || time > max)) max = time
  }
  return max
}

function shell(command, args) {
  return new Promise(resolve => {
    execFile(command, args, { cwd: workspacePath, encoding: 'utf8' }, (error, stdout) => {
      resolve(error ? '' : stdout)
    })
  })
}

function shellWithStatus(command, args) {
  return new Promise(resolve => {
    execFile(command, args, { cwd: workspacePath, encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        code: error?.code ?? 0,
      })
    })
  })
}

async function cursorActivity() {
  const stdout = await shell('ps', ['-axo', 'pid,etime,command'])
  return stdout
    .split('\n')
    .filter(line => line.includes('cursor-agent') || /\/thien-/.test(line))
    .filter(line => !line.includes('server.mjs'))
    .map(line => line.trim())
}

async function readHistory() {
  try {
    return JSON.parse(await readFile(historyPath, 'utf8'))
  } catch {
    return { rows: {} }
  }
}

async function writeHistory(history) {
  await mkdir('/Users/study/.codex/automations', { recursive: true })
  await writeFile(historyPath, JSON.stringify(history, null, 2))
}

async function readReport() {
  try {
    return JSON.parse(await readFile(reportPath, 'utf8'))
  } catch {
    return null
  }
}

async function readCommentFixes() {
  try {
    const state = JSON.parse(await readFile(commentFixPath, 'utf8'))
    return state && typeof state === 'object' ? state : { fixes: {} }
  } catch {
    return { fixes: {} }
  }
}

async function writeCommentFixes(state) {
  await mkdir('/Users/study/.codex/automations', { recursive: true })
  await writeFile(commentFixPath, JSON.stringify(state, null, 2))
}

function commentFixKey(iid, discussionId) {
  return `${iid}:${discussionId}`
}

async function gitHead() {
  const result = await shellWithStatus('git', ['rev-parse', 'HEAD'])
  return result.ok ? result.stdout.trim() : null
}

function outputTail(text) {
  return text.replace(/\s+$/g, '').split('\n').slice(-40).join('\n').slice(-4000)
}

async function startCommentFix({ iid, discussionId, noteId, commentUrl, mrUrl, commentBody }) {
  const state = await readCommentFixes()
  const key = commentFixKey(iid, discussionId)
  const existing = state.fixes?.[key]
  if (existing?.status === 'running' || existing?.status === 'queued') return existing

  const beforeHead = await gitHead()
  const prompt = [
    `Fix the code for this GitLab MR review discussion, then report what changed.`,
    ``,
    `MR: ${mrUrl}`,
    `Discussion: ${commentUrl}`,
    `Discussion id: ${discussionId}`,
    `Note id: ${noteId}`,
    ``,
    `Reviewer comment:`,
    commentBody,
    ``,
    `If the issue is already solved in the current branch, do not make unrelated edits. Identify the commit that fixed it if possible.`,
    `If code action is reasonable, update the code, run focused verification, and create or identify the fixing commit when the workflow naturally creates one.`,
  ].join('\n')

  state.fixes = state.fixes ?? {}
  state.fixes[key] = {
    key,
    iid,
    discussionId,
    noteId,
    commentUrl,
    mrUrl,
    status: 'running',
    startedAt: new Date().toISOString(),
    beforeHead,
    command: `cursor-agent --print --trust --force --workspace ${workspacePath} "<MR comment fix prompt>"`,
    outputSummary: 'Cursor fix is running.',
  }
  await writeCommentFixes(state)

  const child = spawn('cursor-agent', [
    '--print',
    '--trust',
    '--force',
    '--workspace',
    workspacePath,
    prompt,
  ], {
    cwd: workspacePath,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk.toString() })
  child.stderr.on('data', chunk => { stderr += chunk.toString() })
  child.on('error', async error => {
    const latest = await readCommentFixes()
    latest.fixes[key] = {
      ...latest.fixes[key],
      status: 'failed',
      finishedAt: new Date().toISOString(),
      outputSummary: error.message,
    }
    await writeCommentFixes(latest)
  })
  child.on('close', async code => {
    const afterHead = await gitHead()
    const latest = await readCommentFixes()
    const changedHead = beforeHead && afterHead && beforeHead !== afterHead
    latest.fixes[key] = {
      ...latest.fixes[key],
      status: code === 0 ? 'completed' : 'failed',
      finishedAt: new Date().toISOString(),
      afterHead,
      fixedCommit: changedHead ? afterHead : latest.fixes[key]?.fixedCommit ?? null,
      outputSummary: outputTail(stdout || stderr || `cursor-agent exited with code ${code}`),
      exitCode: code,
    }
    await writeCommentFixes(latest)
  })

  return state.fixes[key]
}

async function readAutomationSchedule() {
  try {
    const body = await readFile(automationPath, 'utf8')
    const rrule = body.match(/^rrule = "([^"]+)"/m)?.[1] ?? ''
    const createdAt = Number(body.match(/^created_at = (\d+)/m)?.[1] ?? 0)
    const interval = Number(rrule.match(/INTERVAL=(\d+)/)?.[1] ?? 15)
    const frequency = rrule.match(/^FREQ=([^;]+)/)?.[1] ?? 'MINUTELY'
    return {
      rrule,
      anchorAt: createdAt ? new Date(createdAt).toISOString() : null,
      intervalMs: frequency === 'MINUTELY' ? interval * 60 * 1000 : 15 * 60 * 1000,
    }
  } catch {
    return {
      rrule: 'FREQ=MINUTELY;INTERVAL=15',
      anchorAt: null,
      intervalMs: 15 * 60 * 1000,
    }
  }
}

async function triggerHeartbeatNow() {
  const now = Date.now()
  const result = await shellWithStatus('sqlite3', [
    automationDbPath,
    `update automations set next_run_at = ${now}, updated_at = ${now} where id = 'thien-mr-review-queue'; select changes();`,
  ])
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || 'Unable to update automation schedule')
  }
  if (!result.stdout.trim().split(/\s+/).includes('1')) {
    throw new Error('Automation thien-mr-review-queue was not found in the local Codex automation database')
  }
  return {
    ok: true,
    requestedAt: new Date(now).toISOString(),
    nextRunAt: now,
  }
}

async function readToneMemory() {
  try {
    const memory = JSON.parse(await readFile(toneMemoryPath, 'utf8'))
    return {
      replies: Array.isArray(memory.replies) ? memory.replies : [],
      updatedAt: memory.updatedAt ?? null,
    }
  } catch {
    return { replies: [], updatedAt: null }
  }
}

async function rememberReplyTone(body) {
  const cleanBody = body.replace(/\s+/g, ' ').trim()
  if (!cleanBody) return
  const memory = await readToneMemory()
  const replies = [
    {
      body: cleanBody,
      createdAt: new Date().toISOString(),
    },
    ...memory.replies.filter(reply => reply.body !== cleanBody),
  ].slice(0, 12)
  await mkdir('/Users/study/.codex/automations', { recursive: true })
  await writeFile(toneMemoryPath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    replies,
  }, null, 2))
}

function textPreview(text = '') {
  return text.replace(/\s+/g, ' ').trim().slice(0, 360)
}

function preferredThanks(toneMemory) {
  for (const reply of toneMemory.replies) {
    const match = reply.body.match(/^(thanks(?:\s+\w+)?|thank you|appreciate it|sounds good|got it|yep|yeah|ok|okay)\b[,.!]?\s*/i)
    if (match) return match[1]
  }
  return 'Thanks'
}

function preferredReviewAsk(toneMemory) {
  for (const reply of toneMemory.replies) {
    if (/take another look/i.test(reply.body)) return 'Please take another look when you have a chance.'
    if (/re-?review/i.test(reply.body)) return 'Please re-review when you have a chance.'
    if (/let me know/i.test(reply.body)) return 'Let me know what you think.'
  }
  return 'Please take another look when you have a chance.'
}

function prefersConciseTone(toneMemory) {
  const replies = toneMemory.replies.slice(0, 5)
  if (!replies.length) return false
  const averageLength = replies.reduce((total, reply) => total + reply.body.length, 0) / replies.length
  return averageLength < 120
}

function applyRememberedTone(message, toneMemory) {
  if (!toneMemory.replies.length) return message
  const thanks = preferredThanks(toneMemory)
  const cleanMessage = message.replace(/^(thanks|thank you)[,.]?\s*/i, '').trim()
  const sentence = cleanMessage.charAt(0).toLowerCase() + cleanMessage.slice(1)
  return `${thanks}, ${sentence}`
}

function suggestedReplyFor(note, toneMemory) {
  const body = note.body ?? ''
  if (reasonableCodeAction(note)) {
    if (prefersConciseTone(toneMemory)) {
      return applyRememberedTone('Addressed this in code.', toneMemory)
    }
    return applyRememberedTone(`Addressed this in code. ${preferredReviewAsk(toneMemory)}`, toneMemory)
  }
  if (/\?/.test(body)) {
    if (prefersConciseTone(toneMemory)) {
      return applyRememberedTone('I think we can leave this as-is here.', toneMemory)
    }
    return applyRememberedTone('I do not think this needs a code change right now; the current behavior is intentional here.', toneMemory)
  }
  if (/\b(nit|minor|optional|suggestion|consider)\b/i.test(body)) {
    if (prefersConciseTone(toneMemory)) {
      return applyRememberedTone('Good call. I do not think this needs a change in this MR.', toneMemory)
    }
    return applyRememberedTone('Agreed this is worth keeping in mind. I do not think it needs a code change in this MR.', toneMemory)
  }
  if (prefersConciseTone(toneMemory)) {
    return applyRememberedTone('I do not see a code change needed here.', toneMemory)
  }
  return applyRememberedTone('I do not see a reasonable code action needed here, so I am leaving the implementation as-is.', toneMemory)
}

function reasonableCodeAction(note) {
  const body = note.body ?? ''
  return /\b(please|should|must|bug|broken|fix|change|update|rename|remove|add|missing|incorrect|wrong|failing|test|type|lint|refactor)\b/i.test(body) &&
    !/\b(nit|optional|question|curious|non-blocking|follow-up|future)\b/i.test(body)
}

function openCommentPrompts(discussions, me, mr, toneMemory, commentFixes) {
  const prompts = []
  for (const discussion of discussions) {
    const notes = (discussion.notes ?? []).filter(note => !note.system)
    if (!notes.length) continue
    const unresolved = notes.some(note => note.resolvable && !note.resolved)
    const hasThienNote = notes.some(note => note.author?.id === me.id)
    const isMyMrCodeThread = mr.author?.id === me.id && notes.some(note => note.type === 'DiffNote' || note.position)
    if (!unresolved || (!hasThienNote && !isMyMrCodeThread)) continue
    const latestOther = [...notes].reverse().find(note => note.author?.id !== me.id)
    if (!latestOther) continue
    const latestThienAt = maxTime(notes.filter(note => note.author?.id === me.id), note => note.created_at)
    const latestOtherAt = Date.parse(latestOther.created_at)
    if (hasThienNote && latestThienAt && latestOtherAt <= latestThienAt) continue
    prompts.push({
      discussionId: discussion.id,
      noteId: latestOther.id,
      author: latestOther.author?.name ?? latestOther.author?.username ?? 'Reviewer',
      createdAt: latestOther.created_at,
      body: textPreview(latestOther.body),
      url: latestOther.url ?? mr.web_url,
      suggestedReply: suggestedReplyFor(latestOther, toneMemory),
      codeActionRequired: reasonableCodeAction(latestOther),
      reason: hasThienNote ? 'Reply on Thien comment' : 'Comment on Thien-authored code',
      fix: commentFixes.fixes?.[commentFixKey(mr.iid, discussion.id)] ?? null,
    })
  }
  return prompts
}

async function classifyMr(mr, me, toneMemory, commentFixes) {
  const [notes, commits, approvals, discussions] = await Promise.all([
    gitlabJson(`/projects/${project}/merge_requests/${mr.iid}/notes?per_page=100&sort=asc&order_by=created_at`),
    gitlabJson(`/projects/${project}/merge_requests/${mr.iid}/commits?per_page=100`),
    gitlabJson(`/projects/${project}/merge_requests/${mr.iid}/approvals`),
    gitlabJson(`/projects/${project}/merge_requests/${mr.iid}/discussions?per_page=100`),
  ])

  const approvedByThien = (approvals.approved_by ?? []).some(entry => entry.user?.id === me.id)
  const thienNotes = notes.filter(note => !note.system && note.author?.id === me.id)
  const latestReviewAt =
    maxTime(thienNotes.filter(note => reviewLike(note.body)), note => note.created_at) ??
    maxTime(thienNotes, note => note.created_at)
  const latestCommitAt = maxTime(commits, commit => commit.committed_date ?? commit.created_at)
  const aiPrefixed = mr.title.startsWith('[AI]')
  const needsAction = approvedByThien
    ? false
    : latestReviewAt === null
      ? true
      : latestCommitAt !== null && latestCommitAt > latestReviewAt

  let status = 'Skipped'
  let reason = 'Reviewed by Thien; no later commits'
  if (approvedByThien) {
    status = 'Approved'
    reason = 'Approved by Thien'
  } else if (needsAction && aiPrefixed) {
    status = 'Approve only'
    reason = '[AI] title: approve without review comment'
  } else if (needsAction) {
    status = 'Needs review'
    reason = latestReviewAt === null ? 'No Thien review found' : 'New commits after Thien review'
  }

  return {
    iid: mr.iid,
    title: mr.title,
    url: mr.web_url,
    author: mr.author?.username,
    draft: mr.draft,
    source: mr.source_branch,
    sourceUrl: `${host}/${projectPath}/-/tree/${encodeURIComponent(mr.source_branch)}`,
    target: mr.target_branch,
    targetUrl: `${host}/${projectPath}/-/tree/${encodeURIComponent(mr.target_branch)}`,
    updatedAt: mr.updated_at,
    latestReviewAt: latestReviewAt ? new Date(latestReviewAt).toISOString() : null,
    latestCommitAt: latestCommitAt ? new Date(latestCommitAt).toISOString() : null,
    approvedByThien,
    aiPrefixed,
    needsAction,
    status,
    reason,
    openComments: openCommentPrompts(discussions, me, mr, toneMemory, commentFixes),
  }
}

async function statusPayload() {
  const [me] = await gitlabJson('/users?username=thien.nguyen')
  const toneMemory = await readToneMemory()
  const commentFixes = await readCommentFixes()
  const [assigned, reviewing, opened] = await Promise.all([
    gitlabJson(`/projects/${project}/merge_requests?state=opened&assignee_id=${me.id}&order_by=updated_at&sort=desc&per_page=100`),
    gitlabJson(`/projects/${project}/merge_requests?state=opened&reviewer_id=${me.id}&order_by=updated_at&sort=desc&per_page=100`),
    gitlabJson(`/projects/${project}/merge_requests?state=opened&order_by=updated_at&sort=desc&per_page=100`),
  ])
  const byIid = new Map()
  for (const mr of assigned) byIid.set(mr.iid, mr)
  for (const mr of reviewing) byIid.set(mr.iid, mr)
  const queueRows = await Promise.all([...byIid.values()].map(mr => classifyMr(mr, me, toneMemory, commentFixes)))
  const approvedRows = await Promise.all(
    opened
      .filter(mr => !byIid.has(mr.iid))
      .map(mr => classifyMr(mr, me, toneMemory, commentFixes)),
  )
  const currentRows = [
    ...queueRows,
    ...approvedRows.filter(row => row.approvedByThien),
  ]
  const currentIds = new Set(currentRows.map(row => String(row.iid)))
  const history = await readHistory()

  for (const row of currentRows) {
    history.rows[String(row.iid)] = {
      ...history.rows[String(row.iid)],
      ...row,
      lastSeenAt: new Date().toISOString(),
      finishedAt: null,
    }
  }

  const rows = Object.values(history.rows).map(row => {
    if (currentIds.has(String(row.iid))) return row
    return {
      ...row,
      status: 'Finished',
      reason: row.finishedAt
        ? row.reason
        : 'No longer in the open Thien MR queue',
      needsAction: false,
      finishedAt: row.finishedAt ?? new Date().toISOString(),
    }
  })

  history.rows = Object.fromEntries(rows.map(row => [String(row.iid), row]))
  await writeHistory(history)

  rows.sort((a, b) => Date.parse(b.updatedAt ?? b.finishedAt) - Date.parse(a.updatedAt ?? a.finishedAt))
  return {
    generatedAt: new Date().toISOString(),
    project: projectPath,
    user: { id: me.id, username: me.username, name: me.name },
    cursorActivity: await cursorActivity(),
    report: await readReport(),
    automationSchedule: await readAutomationSchedule(),
    cursorGuidance: await readCursorBaseline(),
    toneMemory: {
      replyCount: toneMemory.replies.length,
      updatedAt: toneMemory.updatedAt,
    },
    rows,
  }
}

function html() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Thien MR Review Queue</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: linear-gradient(135deg, #fff8e8 0%, #eef8ff 42%, #f8f2ff 100%); color: #17211c; }
    header { position: sticky; top: 0; z-index: 2; background: linear-gradient(90deg, #ffffff 0%, #fff6d8 34%, #eaf7ff 68%, #f7edff 100%); border-bottom: 1px solid #d9d7ec; padding: 18px 24px; box-shadow: 0 10px 26px rgba(66, 74, 91, 0.08); }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 780; letter-spacing: 0; color: #12251f; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; color: #576170; font-size: 13px; }
    .status-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .status-line { display: inline-flex; align-items: center; min-height: 32px; padding: 0 12px; border: 1px solid #b9dccc; border-radius: 8px; background: #ffffffcc; color: #24342b; font-size: 13px; font-weight: 700; box-shadow: 0 6px 18px rgba(23, 107, 82, 0.08); }
    .status-dot { width: 8px; height: 8px; border-radius: 999px; margin-right: 8px; background: #9aa69d; }
    .status-line.is-active .status-dot { background: #176b52; box-shadow: 0 0 0 4px rgba(23, 107, 82, 0.14); }
    .run-now-button { display: none; align-items: center; min-height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #ffc36e; background: #fff0bd; color: #815100; font: inherit; font-size: 13px; font-weight: 760; cursor: pointer; box-shadow: 0 6px 18px rgba(163, 92, 8, 0.08); }
    .run-now-button.is-visible { display: inline-flex; }
    .run-now-button:hover { background: #ffe59a; }
    .run-now-button:disabled { opacity: 0.72; cursor: default; }
    .action-detail { display: none; margin-top: 8px; max-width: 980px; border: 1px solid #cfe3ff; border-radius: 8px; background: #f7fbff; color: #23405c; padding: 9px 11px; font-size: 13px; line-height: 1.35; }
    .action-detail.is-visible { display: block; }
    .action-detail strong { color: #123c69; }
    main { padding: 18px 24px 40px; }
    .dashboard-layout { display: grid; gap: 18px; align-items: start; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 18px; }
    .metric { background: #fff; border: 1px solid #dfe5dc; border-radius: 8px; padding: 12px; box-shadow: 0 8px 20px rgba(50, 63, 77, 0.06); }
    .metric:nth-child(1) { border-color: #f0be54; background: #fff8e7; }
    .metric:nth-child(2) { border-color: #9fc3ff; background: #edf5ff; }
    .metric:nth-child(3) { border-color: #90d7ac; background: #effbf2; }
    .metric:nth-child(4) { border-color: #c9ced6; background: #f7f8fa; }
    .metric:nth-child(5) { border-color: #e0b37c; background: #fff2e5; }
    .metric strong { display: block; font-size: 24px; }
    .process-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
    .process-panel { background: #fff; border: 1px solid #dfe5dc; border-radius: 8px; overflow: hidden; min-width: 0; box-shadow: 0 12px 26px rgba(50, 63, 77, 0.08); }
    .process-panel:nth-child(1) { border-top: 4px solid #2f80ed; }
    .process-panel:nth-child(2) { border-top: 4px solid #8b5cf6; }
    .process-panel:nth-child(3) { border-top: 4px solid #f97316; }
    .process-panel h2 { margin: 0; padding: 12px 14px; font-size: 15px; border-bottom: 1px solid #e7ebe4; color: #19243b; }
    .process-panel:nth-child(1) h2 { background: #eef5ff; }
    .process-panel:nth-child(2) h2 { background: #f5f0ff; }
    .process-panel:nth-child(3) h2 { background: #fff3e8; }
    .process-body { padding: 12px; }
    .item-list { display: grid; gap: 10px; }
    .item-card { border: 1px solid #e1e7df; border-left: 5px solid #9fc3ff; border-radius: 8px; padding: 10px; background: #ffffff; box-shadow: 0 8px 18px rgba(50, 63, 77, 0.06); }
    .item-card.is-active { border-color: #20a36b; border-left-color: #20a36b; background: #f1fff7; box-shadow: 0 0 0 2px rgba(32, 163, 107, 0.18), 0 14px 28px rgba(32, 163, 107, 0.14); }
    .item-card a { font-weight: 680; }
    .item-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; font-size: 12px; color: #66736a; }
    .link-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .link-button { display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid #cbd7ea; background: #f7fbff; color: #1d5fa8; font-size: 12px; font-weight: 750; text-decoration: none; }
    .link-button:hover { background: #eaf4ff; text-decoration: none; }
    .link-button.linear { border-color: #d7c8ff; background: #f7f1ff; color: #6d39c7; }
    .link-button.sentry { border-color: #ffd2aa; background: #fff3e8; color: #a44609; }
    .link-button.mr { border-color: #b9d9ff; background: #eef7ff; color: #195db0; }
    .comment-box { margin-top: 10px; border: 1px solid #f0d49a; background: #fffaf0; border-radius: 8px; padding: 10px; }
    .comment-jump { display: block; border-radius: 8px; padding: 4px; margin: -4px; color: inherit; text-decoration: none; }
    .comment-jump:hover { background: #fff4dc; text-decoration: none; }
    .comment-box strong { display: block; font-size: 12px; color: #815100; margin-bottom: 4px; }
    .comment-text { color: #3f4652; font-size: 13px; line-height: 1.35; }
    .reply-suggestion { box-sizing: border-box; width: 100%; min-height: 86px; resize: vertical; margin-top: 8px; color: #335247; font: inherit; font-size: 13px; line-height: 1.35; background: #f1fff7; border: 1px solid #bfe8d2; border-radius: 8px; padding: 8px; }
    .comment-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .reply-button, .fix-button { min-height: 30px; border: 0; border-radius: 8px; color: #fff; font: inherit; font-size: 12px; font-weight: 760; padding: 0 10px; cursor: pointer; }
    .reply-button { background: #12845f; }
    .reply-button:hover { background: #0f6e51; }
    .fix-button { background: #7c3aed; }
    .fix-button:hover { background: #6426cf; }
    .fix-button:disabled, .reply-button:disabled { opacity: 0.7; cursor: default; }
    .fix-status { margin-top: 8px; border-radius: 8px; padding: 8px; background: #f5f0ff; color: #493073; font-size: 12px; line-height: 1.35; }
    .fix-status a { font-size: 12px; }
    .work-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border-radius: 999px; background: #12845f; color: #fff; font-size: 12px; font-weight: 720; box-shadow: 0 4px 10px rgba(18, 132, 95, 0.2); }
    .empty-state { color: #66736a; font-size: 13px; padding: 8px 0; }
    .workflow-rail { min-width: 0; }
    .workflow { background: #fff; border: 1px solid #d9d7ec; border-radius: 8px; margin-bottom: 18px; overflow: hidden; box-shadow: 0 12px 26px rgba(50, 63, 77, 0.07); }
    .workflow summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; padding: 12px 14px; font-size: 15px; font-weight: 780; border-bottom: 1px solid #e7ebe4; background: #f7edff; cursor: pointer; }
    .workflow summary::-webkit-details-marker { display: none; }
    .workflow summary::after { content: "Show"; min-width: 54px; text-align: center; padding: 4px 8px; border-radius: 999px; background: #ffffff; border: 1px solid #d7c8ff; color: #6d39c7; font-size: 12px; font-weight: 750; }
    .workflow[open] summary::after { content: "Hide"; }
    .workflow-note { padding: 12px 14px; color: #526157; font-size: 13px; line-height: 1.45; background: #fffafc; border-bottom: 1px solid #e7ebe4; }
    .workflow-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0; }
    .workflow-step { position: relative; padding: 14px; border-right: 1px solid #e7ebe4; border-bottom: 1px solid #e7ebe4; min-height: 116px; }
    .workflow-step strong { display: block; font-size: 14px; margin-bottom: 6px; }
    .workflow-step span { color: #526157; font-size: 13px; line-height: 1.35; }
    .workflow-step:nth-child(1)::before { background: #2f80ed; }
    .workflow-step:nth-child(2)::before { background: #8b5cf6; }
    .workflow-step:nth-child(3)::before { background: #16a34a; }
    .workflow-step:nth-child(4)::before { background: #0f9f9a; }
    .workflow-step:nth-child(5)::before { background: #f97316; }
    .workflow-step:nth-child(6)::before { background: #d946ef; }
    .workflow-step::before { content: attr(data-step); display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; margin-bottom: 10px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
    .tab { appearance: none; border: 1px solid #cfd8d1; background: #fff; color: #334139; min-height: 34px; padding: 0 12px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
    .tab:hover { border-color: #2f80ed; color: #1c5fb5; background: #eef5ff; }
    .tab.active { background: #2f80ed; border-color: #2f80ed; color: #fff; }
    a { color: #1d6fd1; text-decoration: none; font-weight: 620; }
    a:hover { text-decoration: underline; }
    .mr-link-line { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
    .mr-number { font-weight: 760; }
    .mr-title-link { font-weight: 650; }
    .pill { appearance: none; border: 0; display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 650; white-space: nowrap; cursor: pointer; }
    .pill:hover { text-decoration: underline; }
    .Approved { background: #dff8e8; color: #11623f; }
    .Skipped { background: #eef1f5; color: #506055; }
    .Needs { background: #fff0bd; color: #815100; }
    .Approve { background: #e6edff; color: #244f88; }
    .Finished { background: #ffe8d4; color: #8b4513; }
    .muted { color: #66736a; }
    @media (min-width: 1400px) {
      .dashboard-layout { grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); }
      .workflow-rail { position: sticky; top: 112px; }
      .workflow { margin-bottom: 0; }
      .workflow-grid { grid-template-columns: 1fr; }
      .workflow-step { border-right: 0; min-height: auto; }
    }
    @media (max-width: 1200px) { .process-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>Thien MR Review Queue</h1>
    <div class="meta">
      <span id="generated">Loading...</span>
      <span>Auto-updates every 5 seconds</span>
      <span>${projectPath}</span>
    </div>
    <div class="status-row">
      <div class="status-line" id="statusLine"><span class="status-dot"></span><span>Checking automation status...</span></div>
      <button class="run-now-button" id="runNowButton" type="button">Start now</button>
    </div>
    <div class="action-detail" id="actionDetail"></div>
  </header>
  <main>
    <div class="dashboard-layout">
      <aside class="workflow-rail">
        <details class="workflow" id="workflowDetails">
          <summary>Automation Workflow</summary>
          <div class="workflow-note">Target System Workflow v2: Codex orchestrates live check, delta inventory, and one Cursor launch per heartbeat. Cursor thien-* agents own review, fixes, Sentry triage, and Linear work. Sync automation.toml and thiennp.github.io after changes.</div>
          <div class="workflow-grid">
            <div class="workflow-step" data-step="1"><strong>Live check &amp; sync</strong><span>Curl dashboard :4177; ensure LaunchAgent <code>com.thien.mr-dashboard</code> is alive. Skip queue/git reset if a thien-* Cursor task is running. Start now queues this heartbeat immediately.</span></div>
            <div class="workflow-step" data-step="2"><strong>Refresh inventory</strong><span>Run <code>resolve-automation-cursor-baseline.ts --checkout</code>. If ai-improvement has unmerged <code>.cursor/</code> changes vs staging, checkout branch <code>ai-improvement</code>; else <code>staging</code>. Then delta-fetch MRs, Linear, Sentry.</span></div>
            <div class="workflow-step" data-step="3"><strong>GitLab MRs</strong><span>Draft/approved skip rules; <code>[AI]</code> approve-only; review via <code>/thien-mr-review</code>; Thien-authored rebase/merge in Codex; pipeline/review fixes via <code>/thien-mr-fix-followup</code>. Comments: dashboard only.</span></div>
            <div class="workflow-step" data-step="4"><strong>Linear</strong><span>One assigned ACA issue: <code>/thien-fix-bug</code> or <code>/thien-implement-linear-feature</code>. Skip done, In Review with MR, blocked, or waiting on others.</span></div>
            <div class="workflow-step" data-step="5"><strong>Sentry</strong><span>Codex list-only. When ≥1 actionable row (unassigned or Thien-assigned, no MR) → one <code>/thien-sentry-all</code> (Cursor drains assign, Linear, fix, MR, review for all actionable issues).</span></div>
          </div>
        </details>
      </aside>
      <section class="dashboard-content">
        <section class="summary" id="summary"></section>
        <section class="process-grid" aria-label="Automation process groups">
          <section class="process-panel">
            <h2>MRs</h2>
            <div class="process-body">
              <nav class="tabs" id="tabs" aria-label="MR status filters"></nav>
              <div class="item-list" id="rows"></div>
            </div>
          </section>
          <section class="process-panel">
            <h2>Linear</h2>
            <div class="process-body">
              <div class="item-list" id="linearRows"></div>
            </div>
          </section>
          <section class="process-panel">
            <h2>Sentry</h2>
            <div class="process-body">
              <div class="item-list" id="sentryRows"></div>
            </div>
          </section>
        </section>
      </section>
    </div>
  </main>
  <script>
    let activeFilter = 'All'
    let latestRows = []
    let latestReport = null
    let activeWorkText = ''
    let latestGeneratedAt = null
    let automationSchedule = { anchorAt: null, intervalMs: 15 * 60 * 1000 }
    let runNowBusy = false
    const gitlabHost = '${host}'
    const gitlabProjectPath = '${projectPath}'
    const filters = ['All', 'Needs review', 'Approve only', 'Approved', 'Skipped', 'Finished']
    const fmt = value => value ? new Date(value).toLocaleString() : '—'
    const cls = status => status.split(' ')[0]
    function syncWorkflowDisclosure() {
      const details = document.getElementById('workflowDetails')
      if (!details || details.dataset.userToggled === 'true') return
      details.open = window.matchMedia('(min-width: 1400px)').matches
    }
    function renderTabs(counts) {
      document.getElementById('tabs').innerHTML = filters.map(name => {
        const count = name === 'All' ? latestRows.length : counts[name] || 0
        return '<button class="tab ' + (activeFilter === name ? 'active' : '') + '" type="button" data-filter="' + name + '">' + name + ' (' + count + ')</button>'
      }).join('')
      for (const button of document.querySelectorAll('.tab')) {
        button.addEventListener('click', () => {
          activeFilter = button.dataset.filter
          render()
        })
      }
    }
    function render() {
      const counts = latestRows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {})
      renderTabs(counts)
      const visibleRows = activeFilter === 'All'
        ? latestRows
        : latestRows.filter(row => row.status === activeFilter)
      document.getElementById('rows').innerHTML = visibleRows.map(row => {
        const isActive = activeWorkText.includes(row.url) || activeWorkText.includes('/merge_requests/' + row.iid)
        return '<article class="item-card ' + (isActive ? 'is-active' : '') + '">' +
        '<div class="mr-link-line"><a class="mr-number" href="' + row.url + '" target="_blank">!' + row.iid + '</a><a class="mr-title-link" href="' + row.url + '" target="_blank">' + row.title + '</a></div>' +
        '<a class="muted" href="' + row.url + '" target="_blank">' + row.author + '</a>' +
        '<div class="item-meta">' + (isActive ? '<span class="work-badge">Working now</span>' : '') + '<button class="pill ' + cls(row.status) + '" type="button" data-status-filter="' + row.status + '">' + row.status + '</button><span>' + row.reason + '</span>' + (row.aiPrefixed ? '<span>AI-prefixed</span>' : '') + '</div>' +
        '<div class="item-meta"><a href="' + row.sourceUrl + '" target="_blank">' + row.source + '</a><span>→</span><a href="' + row.targetUrl + '" target="_blank">' + row.target + '</a></div>' +
        renderRelatedLinks(relatedLinksForMr(row)) +
        renderOpenComments(row) +
      '</article>'
      }).join('')
      for (const chip of document.querySelectorAll('[data-status-filter]')) {
        chip.addEventListener('click', () => {
          activeFilter = chip.dataset.statusFilter
          render()
        })
      }
      for (const button of document.querySelectorAll('[data-reply-iid]')) {
        button.addEventListener('click', async () => {
          button.disabled = true
          button.textContent = 'Posting...'
          try {
            const textarea = document.querySelector('[data-reply-text="' + button.dataset.replyKey + '"]')
            const response = await fetch('/api/reply', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                iid: button.dataset.replyIid,
                discussionId: button.dataset.discussionId,
                body: textarea?.value || '',
                originalBody: textarea?.dataset.originalReply || '',
              }),
            })
            if (!response.ok) throw new Error(await response.text())
            button.textContent = 'Posted'
            await load()
          } catch (error) {
            button.disabled = false
            button.textContent = 'Retry reply'
            alert(error.message || String(error))
          }
        })
      }
      for (const button of document.querySelectorAll('[data-fix-comment-iid]')) {
        button.addEventListener('click', async () => {
          button.disabled = true
          button.textContent = 'Starting Cursor...'
          try {
            const response = await fetch('/api/fix-comment', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                iid: button.dataset.fixCommentIid,
                discussionId: button.dataset.discussionId,
                noteId: button.dataset.noteId,
                mrUrl: button.dataset.mrUrl,
                commentUrl: button.dataset.commentUrl,
                commentBody: button.dataset.commentBody,
              }),
            })
            if (!response.ok) throw new Error(await response.text())
            button.textContent = 'Cursor running'
            await load()
          } catch (error) {
            button.disabled = false
            button.textContent = 'Retry fix with Cursor'
            alert(error.message || String(error))
          }
        })
      }
      renderProcessList('linearRows', getReportItems('Linear'))
      renderProcessList('sentryRows', getReportItems('Sentry'))
    }
    function getReportItems(sectionName) {
      const section = latestReport?.[sectionName] || latestReport?.[sectionName.toLowerCase()] || latestReport?.[sectionName.toUpperCase()]
      if (!section) return []
      if (Array.isArray(section)) return section
      if (Array.isArray(section.items)) return section.items
      if (Array.isArray(section.rows)) return section.rows
      return Object.values(section).filter(value => value && typeof value === 'object' && !Array.isArray(value))
    }
    function itemTitle(item) {
      return item.title || item.name || item.key || item.id || 'Untitled item'
    }
    function itemUrl(item) {
      return item.url || item.issue_url || item.issueUrl || item.mr_url || item.sentry_issue_url || item.sentryIssueUrl || '#'
    }
    function itemStatus(item) {
      return item.decision || item.status || item.state || item.outcome || 'recorded'
    }
    function itemAssignee(item) {
      return item.assignee || item.assigneeName || item.assignee_name || item.owner || 'Unassigned'
    }
    function itemTicket(item) {
      return item.issueKey || item.issue_key || item.ticket || item.ticketKey || item.ticket_key || item.linearKey || item.linear_key || ''
    }
    function normalizeUrls(value) {
      if (!value) return []
      const values = Array.isArray(value) ? value : [value]
      return values
        .flatMap(entry => typeof entry === 'string' ? entry.split(/[,\\s]+/) : [])
        .filter(entry => /^https?:\\/\\//.test(entry))
    }
    function relatedLinks(item, fallbackUrl) {
      const links = []
      const add = (label, url, kind) => {
        if (!url || url === '#' || links.some(entry => entry.url === url)) return
        links.push({ label, url, kind })
      }
      for (const url of normalizeUrls(item.linearUrl || item.linear_url || item.linearIssueUrl || item.linear_issue_url || item.resultingLinearUrl || item.resulting_linear_url)) add('Linear', url, 'linear')
      for (const url of normalizeUrls(item.mrUrl || item.mr_url || item.mergeRequestUrl || item.merge_request_url || item.resultingMrUrl || item.resulting_mr_url)) add('MR', url, 'mr')
      for (const url of normalizeUrls(item.sentryUrl || item.sentry_url || item.sentryIssueUrl || item.sentry_issue_url || item.resultingSentryUrl || item.resulting_sentry_url)) add('Sentry', url, 'sentry')
      if (fallbackUrl?.includes('linear.app')) add('Linear', fallbackUrl, 'linear')
      if (fallbackUrl?.includes('/merge_requests/')) add('MR', fallbackUrl, 'mr')
      if (fallbackUrl?.includes('sentry.io')) add('Sentry', fallbackUrl, 'sentry')
      return links
    }
    function relatedLinkLabels(item, fallbackUrl) {
      const links = relatedLinks(item, fallbackUrl)
      return {
        hasLinear: links.some(link => link.kind === 'linear'),
        hasMr: links.some(link => link.kind === 'mr'),
        hasSentry: links.some(link => link.kind === 'sentry'),
      }
    }
    function issueKeyFromText(text = '') {
      return text.match(/\\b[A-Z]+-\\d+\\b/)?.[0] || null
    }
    function sentryIdFromText(text = '') {
      return text.match(/\\b\\d{7,}\\b/)?.[0] || null
    }
    function renderRelatedLinks(links) {
      if (!links.length) return ''
      return '<div class="link-actions">' + links.map(link => '<a class="link-button ' + link.kind + '" href="' + link.url + '" target="_blank">' + link.label + '</a>').join('') + '</div>'
    }
    function escapeAttr(value) {
      return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    function renderFixStatus(comment) {
      const fix = comment.fix
      if (!fix) return ''
      const label = fix.status === 'completed'
        ? 'Code fix completed'
        : fix.status === 'failed'
          ? 'Code fix failed'
          : 'Cursor is fixing this comment'
      const commit = fix.fixedCommit
        ? '<div>Fixed commit: <a href="' + gitlabHost + '/' + gitlabProjectPath + '/-/commit/' + fix.fixedCommit + '" target="_blank">' + fix.fixedCommit.slice(0, 12) + '</a></div>'
        : ''
      const summary = fix.outputSummary ? '<div>' + escapeAttr(fix.outputSummary).slice(0, 420) + '</div>' : ''
      return '<div class="fix-status"><strong>' + label + '</strong>' + commit + summary + '</div>'
    }
    function renderOpenComments(row) {
      if (!row.openComments?.length) return ''
      return row.openComments.map(comment => {
        const replyKey = row.iid + '-' + comment.discussionId
        const commentUrl = comment.url || row.url
        const fix = comment.fix
        const fixedOrRunning = fix && ['running', 'queued', 'completed'].includes(fix.status)
        return '<div class="comment-box">' +
        '<a class="comment-jump" href="' + commentUrl + '" target="_blank" title="Open MR comment">' +
        '<strong>' + comment.reason + ' from ' + comment.author + (comment.codeActionRequired ? ' · Code action expected' : ' · Reply only') + '</strong>' +
        '<div class="comment-text">' + comment.body + '</div>' +
        '</a>' +
        renderFixStatus(comment) +
        '<textarea class="reply-suggestion" data-reply-text="' + replyKey + '" data-original-reply="' + comment.suggestedReply.replace(/"/g, '&quot;') + '">' + comment.suggestedReply + '</textarea>' +
        '<div class="comment-actions">' +
        '<button class="reply-button" type="button" data-reply-iid="' + row.iid + '" data-discussion-id="' + comment.discussionId + '" data-reply-key="' + replyKey + '">Post suggested reply</button>' +
        '<button class="fix-button" type="button" ' + (fixedOrRunning ? 'disabled ' : '') + 'data-fix-comment-iid="' + row.iid + '" data-discussion-id="' + comment.discussionId + '" data-note-id="' + comment.noteId + '" data-mr-url="' + row.url + '" data-comment-url="' + commentUrl + '" data-comment-body="' + escapeAttr(comment.body) + '">' + (fix?.status === 'completed' ? 'Code fixed' : fix?.status === 'running' ? 'Cursor running' : 'Fix code with Cursor') + '</button>' +
        '</div>' +
      '</div>'
      }).join('')
    }
    function relatedLinksForMr(row) {
      const links = relatedLinks(row, row.url)
      const key = issueKeyFromText(row.title + ' ' + row.source)
      if (key) links.push({ label: key, url: 'https://linear.app/fullscript/issue/' + key, kind: 'linear' })
      const sentryId = sentryIdFromText(row.title)
      if (sentryId) links.push({ label: 'Sentry ' + sentryId, url: 'https://fullscript.sentry.io/issues/' + sentryId + '/', kind: 'sentry' })
      return links.filter((link, index, all) => all.findIndex(other => other.url === link.url) === index)
    }
    function setStatusLine(text, active = false) {
      const statusLine = document.getElementById('statusLine')
      const runNowButton = document.getElementById('runNowButton')
      statusLine.classList.toggle('is-active', active)
      statusLine.querySelector('span:last-child').textContent = text
      runNowButton.classList.toggle('is-visible', !active)
      runNowButton.disabled = active || runNowBusy
    }
    function currentAction() {
      return latestReport?.currentAction || latestReport?.current_action || null
    }
    function renderActionDetail() {
      const detail = document.getElementById('actionDetail')
      const action = currentAction()
      if (!action || !action.phase || !action.detail) {
        detail.classList.remove('is-visible')
        detail.innerHTML = ''
        return
      }
      const bits = [
        '<strong>' + action.phase + '</strong>',
        action.detail,
        action.source ? '<span>Source: ' + action.source + '</span>' : '',
        action.itemTitle ? '<span>Item: ' + action.itemTitle + '</span>' : '',
        action.updatedAt ? '<span>Updated ' + fmt(action.updatedAt) + '</span>' : '',
      ].filter(Boolean)
      const body = bits.join(' · ')
      detail.innerHTML = action.itemUrl
        ? '<a href="' + action.itemUrl + '" target="_blank">' + body + '</a>'
        : body
      detail.classList.add('is-visible')
    }
    function countdownText(ms) {
      const safeMs = Math.max(0, ms)
      const totalSeconds = Math.ceil(safeMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
    }
    function elapsedText(value) {
      if (!value) return ''
      const started = Date.parse(value)
      if (Number.isNaN(started)) return ''
      const totalSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      if (hours > 0) return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
      return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
    }
    function nextHeartbeatRemainingMs() {
      const intervalMs = automationSchedule.intervalMs || 15 * 60 * 1000
      const base = automationSchedule.anchorAt ? Date.parse(automationSchedule.anchorAt) : Date.now()
      if (Number.isNaN(base)) return intervalMs
      const elapsed = Date.now() - base
      if (elapsed < 0) return Math.min(intervalMs, Math.abs(elapsed))
      const remainder = elapsed % intervalMs
      return remainder === 0 ? intervalMs : intervalMs - remainder
    }
    function refreshStatusLine() {
      const action = currentAction()
      if (action?.status === 'running' && action.phase) {
        setStatusLine(action.phase + ': ' + action.detail, true)
        renderActionDetail()
        return
      }
      if (activeWorkText) {
        setStatusLine(activeStatusLabel(), true)
        renderActionDetail()
        return
      }
      setStatusLine('Waiting for next heartbeat round, in ' + countdownText(nextHeartbeatRemainingMs()) + '.', false)
      renderActionDetail()
    }
    function activeStatusLabel() {
      if (!activeWorkText) return 'Waiting for next heartbeat round, in ' + countdownText(nextHeartbeatRemainingMs()) + '.'

      const activeMr = latestRows.find(row => activeWorkText.includes(row.url) || activeWorkText.includes('/merge_requests/' + row.iid))
      if (activeMr) return 'Reviewing MR !' + activeMr.iid + ': ' + activeMr.title

      const linearItems = getReportItems('Linear')
      const activeLinear = linearItems.find(item => {
        const url = itemUrl(item)
        const title = itemTitle(item)
        const command = item.command || item.commandRun || item.workflow || ''
        return (url !== '#' && activeWorkText.includes(url)) || (command && activeWorkText.includes(command)) || activeWorkText.includes(title)
      })
      if (activeLinear) {
        const command = activeLinear.command || activeLinear.commandRun || activeLinear.workflow || activeWorkText
        const verb = command.includes('/thien-fix-bug') ? 'Fixing Linear' : 'Implementing Linear'
        return verb + ': ' + itemTitle(activeLinear)
      }

      const sentryItems = getReportItems('Sentry')
      const activeSentry = sentryItems.find(item => {
        const url = itemUrl(item)
        const title = itemTitle(item)
        const command = item.command || item.commandRun || item.workflow || ''
        return (url !== '#' && activeWorkText.includes(url)) || (command && activeWorkText.includes(command)) || activeWorkText.includes(title)
      })
      if (activeSentry) return 'Solving Sentry: ' + itemTitle(activeSentry)

      if (activeWorkText.includes('/thien-mr-review')) return 'Reviewing an MR with Cursor.'
      if (activeWorkText.includes('/thien-fix-bug')) return 'Fixing a Linear bug with Cursor.'
      if (activeWorkText.includes('/thien-implement-linear-feature')) return 'Implementing a Linear feature with Cursor.'
      if (activeWorkText.includes('/thien-sentry-single-issue')) return 'Solving a Sentry issue with Cursor.'
      if (activeWorkText.includes('/thien-sentry-all')) return 'Draining Sentry issues with Cursor.'
      if (activeWorkText.includes('/thien-mr-fix-followup')) return 'Fixing MR comments or pipeline with Cursor.'
      return 'Cursor task is running.'
    }
    function renderProcessList(elementId, items) {
      const target = document.getElementById(elementId)
      if (!items.length) {
        target.innerHTML = '<div class="empty-state">No items recorded yet.</div>'
        return
      }
      target.innerHTML = items.map(item => {
        const url = itemUrl(item)
        const title = itemTitle(item)
        const command = item.command || item.commandRun || item.workflow || ''
        const next = item.nextAction || item.next_action || item.blockers || ''
        const isActive = (url !== '#' && activeWorkText.includes(url)) || (command && activeWorkText.includes(command)) || activeWorkText.includes(title)
        const startedAt = item.startedAt || item.started_at || item.workingStartedAt || item.working_started_at
        const spent = isActive ? elapsedText(startedAt) : ''
        const ticket = itemTicket(item)
        const assignee = itemAssignee(item)
        const labels = relatedLinkLabels(item, url)
        const sentryMeta = elementId === 'sentryRows'
          ? '<div class="item-meta">' +
            (ticket ? '<span>Ticket: ' + ticket + '</span>' : '') +
            '<span>Assignee: ' + assignee + '</span>' +
            '<span>MR: ' + (labels.hasMr ? 'linked' : 'none') + '</span>' +
            '<span>Linear: ' + (labels.hasLinear ? 'linked' : 'none') + '</span>' +
            '</div>'
          : ''
        return '<article class="item-card ' + (isActive ? 'is-active' : '') + '">' +
          '<a href="' + url + '" target="_blank">' + title + '</a>' +
          '<div class="item-meta">' + (isActive ? '<span class="work-badge">Working now' + (spent ? ' · ' + spent : '') + '</span>' : '') + '<span>' + itemStatus(item) + '</span>' + (command ? '<span>' + command + '</span>' : '') + '</div>' +
          sentryMeta +
          (next ? '<div class="muted">' + next + '</div>' : '') +
          renderRelatedLinks(relatedLinks(item, url)) +
        '</article>'
      }).join('')
    }
    async function load() {
      const response = await fetch('/api/status', { cache: 'no-store' })
      const data = await response.json()
      latestRows = data.rows
      latestReport = data.report
      activeWorkText = (data.cursorActivity || []).join('\\n')
      latestGeneratedAt = data.generatedAt
      automationSchedule = data.automationSchedule || automationSchedule
      document.getElementById('generated').textContent = 'Updated ' + fmt(data.generatedAt)
      refreshStatusLine()
      const counts = data.rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {})
      document.getElementById('summary').innerHTML = ['Needs review', 'Approve only', 'Approved', 'Skipped', 'Finished']
        .map(name => '<div class="metric"><span class="muted">' + name + '</span><strong>' + (counts[name] || 0) + '</strong></div>')
        .join('')
      render()
    }
    document.getElementById('runNowButton').addEventListener('click', async () => {
      const button = document.getElementById('runNowButton')
      runNowBusy = true
      button.disabled = true
      button.textContent = 'Starting...'
      try {
        const response = await fetch('/api/run-now', { method: 'POST', cache: 'no-store' })
        if (!response.ok) throw new Error(await response.text())
        await response.json()
        setStatusLine('Heartbeat queued to start now.', false)
        button.textContent = 'Queued'
        setTimeout(() => {
          runNowBusy = false
          button.textContent = 'Start now'
          load()
        }, 2500)
      } catch (error) {
        runNowBusy = false
        button.disabled = false
        button.textContent = 'Retry start'
        alert(error.message || String(error))
      }
    })
    load().catch(error => {
      document.getElementById('generated').textContent = error.message || String(error)
    })
    setInterval(load, 5000)
    setInterval(() => {
      refreshStatusLine()
      if (activeWorkText) render()
    }, 1000)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) load()
    })
    window.addEventListener('focus', load)
    document.querySelector('#workflowDetails summary')?.addEventListener('click', event => {
      event.currentTarget.closest('details').dataset.userToggled = 'true'
    })
    syncWorkflowDisclosure()
    window.matchMedia('(min-width: 1400px)').addEventListener('change', syncWorkflowDisclosure)
  </script>
</body>
</html>`
}

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/api/run-now' && request.method === 'POST') {
      const payload = await triggerHeartbeatNow()
      response.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store, max-age=0',
      })
      response.end(JSON.stringify(payload))
      return
    }
    if (request.url === '/api/fix-comment' && request.method === 'POST') {
      const { iid, discussionId, noteId, commentUrl, mrUrl, commentBody } = await readJsonBody(request)
      if (!iid || !discussionId || !commentUrl || !mrUrl || !commentBody) {
        response.writeHead(400, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'Missing iid, discussionId, commentUrl, mrUrl, or commentBody' }))
        return
      }
      const fix = await startCommentFix({
        iid,
        discussionId,
        noteId,
        commentUrl,
        mrUrl,
        commentBody,
      })
      response.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store, max-age=0',
      })
      response.end(JSON.stringify({ ok: true, fix }))
      return
    }
    if (request.url === '/api/reply' && request.method === 'POST') {
      const { iid, discussionId, body } = await readJsonBody(request)
      if (!iid || !discussionId || !body) {
        response.writeHead(400, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'Missing iid, discussionId, or body' }))
        return
      }
      const note = await gitlabRequest(`/projects/${project}/merge_requests/${iid}/discussions/${discussionId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      await rememberReplyTone(body)
      response.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store, max-age=0',
      })
      response.end(JSON.stringify({ ok: true, note }))
      return
    }
    if (request.url === '/api/status') {
      const payload = await statusPayload()
      response.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store, max-age=0',
      })
      response.end(JSON.stringify(payload))
      return
    }
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    })
    response.end(html())
  } catch (error) {
    response.writeHead(500, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: error.message }))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Thien MR dashboard: http://127.0.0.1:${port}`)
})
