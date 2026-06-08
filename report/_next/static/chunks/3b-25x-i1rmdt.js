(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31713,e=>{"use strict";var s=e.i(43476),t=e.i(71645);function a(){let e=window.location.hostname,s=window.location.port;return"thiennp.github.io"===e?"static":("127.0.0.1"===e||"localhost"===e)&&("3120"===s||"3121"===s)?"live":"static"}let n="automation-report-dashboard-v1";function r(e){return!!e&&"object"==typeof e&&!!(e.workStatus&&e.report)}function i(){try{let e=window.localStorage.getItem(n);if(!e)return null;let s=JSON.parse(e);if(r(s))return s}catch{}return null}function l(e){window.localStorage.setItem(n,JSON.stringify(e))}let o="https://thiennp.github.io/report/",c=`AUTOMATION REPORT — AGENT LOGGING PROMPT

Public dashboard: ${o}
Published snapshot: https://thiennp.github.io/report/dashboard.json

You are an automation agent (Codex, Cursor, or similar). Log every meaningful workflow step so this dashboard shows what you are doing. Humans read ${o}; you write through the local Automation Report API, then publish when the public snapshot should change.

WHEN TO LOG
- At run start, each step transition, blocker, success, and terminal state.
- After Jira/PR/Sentry actions that change current work.
- When status changes: running, success, warning, blocked, pending.

BEFORE WRITING
1. Ensure the local server is up:
   cd automation-report && ./scripts/ensure-automation-report-server.sh
2. Local write endpoints (not exposed on GitHub Pages):
   - HTTP work status: http://127.0.0.1:3120/api/work-status
   - WebSocket ingest: ws://127.0.0.1:3120/ws
   - Dashboard read/clear: http://127.0.0.1:3120/api/dashboard

PREFERRED — LOG CURRENT WORK (run each step)
node bin/send-work-status.mjs \\
  --status running \\
  --step "2.1" \\
  --phase cursor \\
  --title "Short headline of current work" \\
  --pre PRE-4401 \\
  --automationId "my-automation-id" \\
  --runId "20260608T120000Z" \\
  --agentName "Codex" \\
  --nextStep "2.2" \\
  "One-line message describing what you are doing right now."

ALTERNATIVE — WEBSOCKET MESSAGE
Send to ws://127.0.0.1:3120/ws after connect:
{
  "type": "work-status.update",
  "payload": {
    "status": "running",
    "step": "2.1",
    "phase": "cursor",
    "title": "Short headline of current work",
    "message": "One-line message describing what you are doing right now.",
    "pre": "PRE-4401",
    "automationId": "my-automation-id",
    "runId": "20260608T120000Z",
    "agentName": "Codex",
    "nextStep": "2.2"
  }
}

OPTIONAL — APPEND ACTIVITY EVENT
curl -fsS -X POST http://127.0.0.1:3120/api/automations/{automationId}/runs/{runId}/events \\
  -H 'Content-Type: application/json' \\
  -d '{
    "stepNumber": "2.1",
    "title": "Step title",
    "status": "running",
    "message": "What happened in this step.",
    "nextStep": "2.2",
    "agentName": "Codex"
  }'

PUBLISH TO ${o}
After material updates, sync the public snapshot:
cd automation-report && npm run deploy:pages
git add report/ && git commit -m "Sync automation report snapshot" && git push origin master

CLEAR DASHBOARD
DELETE http://127.0.0.1:3120/api/dashboard
Then redeploy if the public snapshot should reset.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Include PRE-#### when tied to Jira.
- Activity history is capped at 200 events; older entries are trimmed automatically.
- Do not treat ${o} as a write target; GitHub Pages is read-only except via deploy:pages.`;function d(){return(0,s.jsxs)("section",{className:"panel instructions",children:[(0,s.jsxs)("div",{className:"panel-head",children:[(0,s.jsx)("h2",{children:"Agent logging prompt"}),(0,s.jsx)("span",{className:"muted",children:(0,s.jsx)("a",{href:o,children:o})})]}),(0,s.jsx)("p",{className:"muted instructions_lead",children:"Copy this prompt into Codex automations, Cursor rules, or runbooks so agents log actions to the dashboard."}),(0,s.jsx)("pre",{className:"instructions_code instructions_prompt",children:(0,s.jsx)("code",{children:c})})]})}let u={status:"pending",title:"Waiting for work status",message:"Agents should log work status to https://thiennp.github.io/report/ using the prompt below.",source:"automation-report",updatedAt:new Date().toISOString()},h={title:"Check24 Sentry Issues",message:"Waiting for the first Sentry refresh.",status:"pending",updatedAt:new Date().toISOString(),issueCount:0,issues:[]};function p(){let e=new Date().toISOString();return{workStatus:{...u,updatedAt:e},automations:[],recentEvents:[],report:{...h,updatedAt:e}}}function m(e){let s=(e||"").toLowerCase();return s.includes("fatal")||s.includes("error")||s.includes("critical")||s.includes("blocked")?"danger":s.includes("warning")||s.includes("warn")||s.includes("pending")?"warn":s.includes("resolved")||s.includes("success")||s.includes("healthy")||s.includes("done")?"good":(s.includes("running")||s.includes("info"),"neutral")}function g(e){if(!e)return"n/a";let s=new Date(e);return Number.isNaN(s.getTime())?e:s.toLocaleString()}async function x(e){let s=await fetch(e,{cache:"no-store"});if(!s.ok)throw Error(`${s.status} ${s.statusText}`);return s.json()}e.s(["default",0,function(){var e,o,c,h;let[j,w]=(0,t.useState)("static"),[N,v]=(0,t.useState)({}),[b,f]=(0,t.useState)(p()),[S,y]=(0,t.useState)("static"),[I,k]=(0,t.useState)("none"),[E,T]=(0,t.useState)("loading"),[O,R]=(0,t.useState)(""),[$,A]=(0,t.useState)(!1),_=(0,t.useRef)(!1),C=(e,s)=>{let t={...e,recentEvents:e.recentEvents.slice(0,200)};f(t),T(s),"static"===a()&&l(t)},P=async(e=j,s=!1)=>{if("static"!==e||!_.current||s)try{let s=await x("live"===e?"/api/dashboard":new URL("dashboard.json",window.location.href).toString());C(s,"live"===e?"live-api":"dashboard.json");let t="live"===e?"/api/health":"";if(t){let e=await x(t);v(e);return}v({status:"github-pages",storeVersion:0,websocket:{ready:!1,clients:0}})}catch{if("static"===e){let e=i();e&&(C(e,"localStorage"),v({status:"github-pages-cache",storeVersion:0,websocket:{ready:!1,clients:0}}))}}},L=async()=>{if(window.confirm("Clear the dashboard? This removes current work, activities, automations, and issues.")){A(!0);try{if("live"===j){let e=await fetch("/api/dashboard",{method:"DELETE"});if(!e.ok)throw Error(`${e.status} ${e.statusText}`);_.current=!1,await P("live",!0);return}window.localStorage.removeItem(n),_.current=!0,C(p(),"cleared")}catch{window.alert("Could not clear the dashboard. On GitHub Pages this only clears the browser cache; use Refresh to reload the published snapshot.")}finally{A(!1)}}};(0,t.useEffect)(()=>{var e;let s,t,n,o=i();o&&C(o,"localStorage");let c=a();return w(c),y("live"===c?"connecting":"snapshot"),P(c).catch(()=>void 0),e=e=>{C(e,"ingest")},s=window,t=s=>{r(s)&&(l(s),e(s))},s.__AUTOMATION_REPORT__={...s.__AUTOMATION_REPORT__,pushDashboard:t},n=e=>{let s=e.data;s?.type==="dashboard.update"&&r(s.payload)&&t(s.payload)},window.addEventListener("message",n),()=>{window.removeEventListener("message",n),s.__AUTOMATION_REPORT__?.pushDashboard===t&&delete s.__AUTOMATION_REPORT__?.pushDashboard}},[]),(0,t.useEffect)(()=>{if("live"!==j){let e=setInterval(()=>{P("static").catch(()=>void 0)},6e4);return()=>clearInterval(e)}let e=null,s=!1,t=null,a=function(e){if("live"!==e)return"";let s="https:"===window.location.protocol?"wss":"ws";return`${s}://${window.location.host}/ws`}("live"),n=()=>{a&&((e=new WebSocket(a)).onopen=()=>y("connected"),e.onclose=()=>{y("reconnecting"),s||(t=setTimeout(n,1200))},e.onerror=()=>y("error"),e.onmessage=e=>{k(e.data),P("live").catch(()=>void 0)})};return n(),()=>{s=!0,t&&clearTimeout(t),e?.close()}},[j]);let U=b.workStatus||u,D=b.report.issues||[],G=(0,t.useMemo)(()=>{let e=O.trim().toLowerCase();return e?D.filter(s=>JSON.stringify(s).toLowerCase().includes(e)):D},[D,O]),W=[U.url?{label:"Evidence",href:U.url}:null,U.pre?{label:U.pre,href:(e=U.pre)&&/^PRE-\d+$/i.test(e)?`https://c24-energie.atlassian.net/browse/${e.toUpperCase()}`:""}:null,U.repo&&U.pr?{label:`${U.repo} #${U.pr}`,href:(o=U.repo,c=U.pr,o&&c?`https://bitbucket.org/check24/${o}/pull-requests/${c}`:"")}:null,U.sentryIssueId?{label:`Sentry ${U.sentryIssueId}`,href:(h=U.sentryIssueId)?`https://check24-energie.sentry.io/issues/${h}/`:""}:null].filter(e=>!!e?.href),H=b.automations.reduce((e,s)=>e+s.activeBlockerCount,0);return(0,s.jsxs)("main",{children:[(0,s.jsxs)("header",{className:"topbar",children:[(0,s.jsxs)("div",{children:[(0,s.jsx)("p",{className:"eyebrow",children:U.source||"current work"}),(0,s.jsx)("h1",{children:U.title}),(0,s.jsx)("p",{className:"lead",children:U.message})]}),(0,s.jsxs)("div",{className:"status-grid",children:[(0,s.jsx)("span",{className:`pill ${m(U.status)}`,children:U.status||"unknown"}),(0,s.jsx)("span",{className:`pill ${"connected"===S?"good":"warn"}`,children:"live"===j?`WS ${S}`:"GitHub Pages snapshot"}),(0,s.jsx)("span",{className:`pill ${m(N.status)}`,children:N.status||"health unknown"})]})]}),(0,s.jsxs)("section",{className:"work-hero",children:[(0,s.jsxs)("div",{className:"work-hero_main",children:[(0,s.jsxs)("div",{className:"work-hero_meta",children:[U.step?(0,s.jsxs)("span",{className:"pill neutral",children:["Step ",U.step]}):null,U.phase?(0,s.jsx)("span",{className:"pill neutral",children:U.phase}):null,U.nextStep?(0,s.jsxs)("span",{className:"pill warn",children:["Next ",U.nextStep]}):null,U.agentName?(0,s.jsx)("span",{className:"pill neutral",children:U.agentName}):null]}),(0,s.jsx)("p",{className:"work-hero_target",children:U.pre||U.sentryKey||(U.repo&&U.pr?`${U.repo} #${U.pr}`:"No active target yet")}),U.automationId?(0,s.jsxs)("p",{className:"muted",children:[U.automationId,U.runId?` \xb7 ${U.runId}`:""]}):null]}),(0,s.jsxs)("div",{className:"work-hero_links",children:[0===W.length?(0,s.jsx)("span",{className:"muted",children:"No linked evidence yet."}):null,W.map(e=>(0,s.jsx)("a",{className:"button-link",href:e.href,children:e.label},e.href))]})]}),(0,s.jsxs)("section",{className:"metrics",children:[(0,s.jsxs)("div",{children:[(0,s.jsx)("span",{children:"Automations"}),(0,s.jsx)("strong",{children:b.automations.length})]}),(0,s.jsxs)("div",{children:[(0,s.jsx)("span",{children:"Blocked Items"}),(0,s.jsx)("strong",{children:H})]}),(0,s.jsxs)("div",{children:[(0,s.jsx)("span",{children:"Recent Events"}),(0,s.jsx)("strong",{children:b.recentEvents.length})]}),(0,s.jsxs)("div",{children:[(0,s.jsx)("span",{children:"Updated"}),(0,s.jsx)("strong",{className:"metric-time",children:g(U.updatedAt)})]})]}),(0,s.jsxs)("section",{className:"toolbar",children:[(0,s.jsxs)("label",{children:["Filter Sentry issues",(0,s.jsx)("input",{value:O,onChange:e=>R(e.target.value),placeholder:"Project, title, culprit, status..."})]}),(0,s.jsx)("button",{onClick:()=>{_.current=!1,P(j,!0).catch(()=>void 0)},children:"Refresh"}),(0,s.jsx)("button",{className:"button-danger",disabled:$,onClick:()=>{L().catch(()=>void 0)},children:$?"Clearing…":"Clear report"}),b.report.url?(0,s.jsx)("a",{className:"button-link",href:b.report.url,children:"Open Sentry"}):null]}),(0,s.jsxs)("section",{className:"dashboard-grid",children:[(0,s.jsxs)("section",{className:"panel",children:[(0,s.jsxs)("div",{className:"panel-head",children:[(0,s.jsx)("h2",{children:"Recent Activity"}),(0,s.jsxs)("span",{className:"muted",children:[b.recentEvents.length," events · max ",200]})]}),(0,s.jsxs)("div",{className:"timeline",children:[0===b.recentEvents.length?(0,s.jsx)("p",{className:"muted",children:"No automation events yet."}):null,b.recentEvents.map(e=>(0,s.jsxs)("article",{className:"timeline-item",children:[(0,s.jsxs)("div",{className:"timeline-item_head",children:[(0,s.jsx)("strong",{children:e.title}),(0,s.jsx)("span",{className:`pill ${m(e.status)}`,children:e.status||"info"})]}),(0,s.jsx)("p",{children:e.message||`${e.automationId} \xb7 ${e.runId}`}),(0,s.jsxs)("div",{className:"timeline-item_meta",children:[e.stepNumber?(0,s.jsxs)("span",{children:["Step ",e.stepNumber]}):null,e.nextStep?(0,s.jsxs)("span",{children:["Next ",e.nextStep]}):null,e.agentName?(0,s.jsx)("span",{children:e.agentName}):null,(0,s.jsx)("span",{children:g(e.createdAt)})]})]},`${e.automationId}-${e.runId}-${e.id}`))]})]}),(0,s.jsxs)("section",{className:"panel",children:[(0,s.jsxs)("div",{className:"panel-head",children:[(0,s.jsx)("h2",{children:"Automations"}),(0,s.jsxs)("span",{className:"muted",children:[b.automations.length," tracked"]})]}),(0,s.jsxs)("div",{className:"automation-list",children:[0===b.automations.length?(0,s.jsx)("p",{className:"muted",children:"No automations registered yet."}):null,b.automations.map(e=>(0,s.jsxs)("article",{className:"automation-card",children:[(0,s.jsxs)("div",{className:"automation-card_head",children:[(0,s.jsx)("strong",{children:e.automationId}),(0,s.jsx)("span",{className:`pill ${m(e.latestStatus)}`,children:e.latestStatus||"info"})]}),(0,s.jsxs)("div",{className:"automation-card_meta",children:[e.latestRunId?(0,s.jsxs)("span",{children:["Run ",e.latestRunId]}):null,(0,s.jsxs)("span",{children:[e.activeBlockerCount," blocked"]}),(0,s.jsx)("span",{children:g(e.latestUpdateTime)})]})]},e.automationId))]})]})]}),(0,s.jsxs)("section",{className:"panel",children:[(0,s.jsxs)("div",{className:"panel-head",children:[(0,s.jsx)("h2",{children:"Sentry Issues"}),(0,s.jsxs)("span",{className:"muted",children:[G.length," shown · ",b.report.message]})]}),(0,s.jsxs)("div",{className:"issue-list",children:[0===G.length?(0,s.jsx)("p",{className:"muted",children:"No issues in the current report."}):null,G.map(e=>{let t=e.issueUrl||"";return(0,s.jsxs)("article",{className:"issue",children:[(0,s.jsxs)("div",{className:"issue-main",children:[(0,s.jsxs)("div",{children:[(0,s.jsxs)("div",{className:"issue-title",children:[(0,s.jsx)("strong",{children:e.title}),e.shortId?(0,s.jsx)("span",{children:e.shortId}):null]}),(0,s.jsx)("p",{children:e.culprit||e.project||"Sentry issue"})]}),(0,s.jsxs)("div",{className:"issue-pills",children:[(0,s.jsx)("span",{className:`pill ${m(e.status||b.report.status)}`,children:e.status||"unresolved"}),e.level?(0,s.jsx)("span",{className:`pill ${m(e.level)}`,children:e.level}):null]})]}),(0,s.jsxs)("div",{className:"issue-meta",children:[e.project?(0,s.jsx)("span",{children:e.project}):null,e.lastSeen?(0,s.jsxs)("span",{children:["Last ",g(e.lastSeen)]}):null,t?(0,s.jsx)("a",{href:t,children:"View"}):null]})]},e.id)})]})]}),(0,s.jsx)(d,{}),(0,s.jsxs)("footer",{children:[(0,s.jsx)("span",{children:"live"===j?`Store v${N.storeVersion??0}: ${N.storePath||"not loaded"}`:`Data source: ${E}`}),(0,s.jsx)("span",{children:"live"===j?`WS clients ${N.websocket?.clients??0}; last ${I.slice(0,140)}`:`Snapshot updated ${g(U.updatedAt)}`})]})]})}],31713)}]);