(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31713,e=>{"use strict";var t=e.i(43476),s=e.i(71645);function a(){let e=window.location.hostname,t=window.location.port;return"thiennp.github.io"===e?"static":("127.0.0.1"===e||"localhost"===e)&&("3120"===t||"3121"===t)?"live":"static"}function n(){let e=new Date().toISOString();return{workStatus:{status:"pending",title:"Waiting for work status",message:"Agents should log work status to https://thiennp.github.io/report/ using the prompt below.",source:"automation-report",updatedAt:e},automations:[],recentEvents:[],report:{title:"Check24 Sentry Issues",message:"Waiting for the first Sentry refresh.",status:"pending",updatedAt:e,issueCount:0,issues:[]}}}let r="automation-report-dashboard-v1",i="automation-report-cleared-v1";function l(e){return!!e&&"object"==typeof e&&!!(e.workStatus&&e.report)}function o(){try{let e=window.localStorage.getItem(r);if(!e)return null;let t=JSON.parse(e);if(l(t))return t}catch{}return null}function c(e){window.localStorage.setItem(r,JSON.stringify(e))}function d(){window.localStorage.removeItem(i)}let u="https://thiennp.github.io/report/",h=`AUTOMATION REPORT — AGENT LOGGING PROMPT

Public dashboard: ${u}
Published snapshot: https://thiennp.github.io/report/dashboard.json

You are an automation agent (Codex, Cursor, or similar). Log every meaningful workflow step so this dashboard shows what you are doing. Humans read ${u}; you write through the local Automation Report API, then publish when the public snapshot should change.

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

PUBLISH TO ${u}
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
- Do not treat ${u} as a write target; GitHub Pages is read-only except via deploy:pages.`;function p(){return(0,t.jsxs)("section",{className:"panel instructions",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Agent logging prompt"}),(0,t.jsx)("span",{className:"muted",children:(0,t.jsx)("a",{href:u,children:u})})]}),(0,t.jsx)("p",{className:"muted instructions_lead",children:"Copy this prompt into Codex automations, Cursor rules, or runbooks so agents log actions to the dashboard."}),(0,t.jsx)("pre",{className:"instructions_code instructions_prompt",children:(0,t.jsx)("code",{children:h})})]})}let m={status:"pending",title:"Waiting for work status",message:"Agents should log work status to https://thiennp.github.io/report/ using the prompt below.",source:"automation-report",updatedAt:new Date().toISOString()};function g(e){let t=(e||"").toLowerCase();return t.includes("fatal")||t.includes("error")||t.includes("critical")||t.includes("blocked")?"danger":t.includes("warning")||t.includes("warn")||t.includes("pending")?"warn":t.includes("resolved")||t.includes("success")||t.includes("healthy")||t.includes("done")?"good":(t.includes("running")||t.includes("info"),"neutral")}function x(e){if(!e)return"n/a";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleString()}async function j(e){let t=await fetch(e,{cache:"no-store"});if(!t.ok)throw Error(`${t.status} ${t.statusText}`);return t.json()}new Date().toISOString(),e.s(["default",0,function(){var e,r,u,h;let[w,N]=(0,s.useState)("static"),[v,b]=(0,s.useState)({}),[f,S]=(0,s.useState)(n()),[y,k]=(0,s.useState)("static"),[I,E]=(0,s.useState)("none"),[T,O]=(0,s.useState)("loading"),[$,R]=(0,s.useState)(""),[A,C]=(0,s.useState)(!1),_=(e,t)=>{let s={...e,recentEvents:e.recentEvents.slice(0,200)};S(s),O(t),"static"===a()&&"cleared"!==t&&c(s)},P=async(e=w,t=!1)=>{if("static"===e&&"1"===window.localStorage.getItem(i)&&!t){_(o()??n(),"cleared"),b({status:"github-pages-cleared",storeVersion:0,websocket:{ready:!1,clients:0}});return}try{let t=await j("live"===e?"/api/dashboard":new URL("dashboard.json",window.location.href).toString());"static"===e&&d(),_(t,"live"===e?"live-api":"dashboard.json");let s="live"===e?"/api/health":"";if(s){let e=await j(s);b(e);return}b({status:"github-pages",storeVersion:0,websocket:{ready:!1,clients:0}})}catch{if("static"===e){let e=o();e&&(_(e,"localStorage"),b({status:"github-pages-cache",storeVersion:0,websocket:{ready:!1,clients:0}}))}}},L=async()=>{if(window.confirm("live"===w?"Clear the dashboard? This removes current work, activities, automations, and issues from the server.":"Clear the dashboard in this browser? The published snapshot at dashboard.json is unchanged until you click Refresh.")){C(!0);try{if("live"===w){let e=await fetch("/api/dashboard",{method:"DELETE"});if(!e.ok)throw Error(`${e.status} ${e.statusText}`);await P("live",!0);return}window.localStorage.setItem(i,"1"),c(n()),_(n(),"cleared")}catch{window.alert("Could not clear the dashboard. On the live server, check that DELETE /api/dashboard is allowed.")}finally{C(!1)}}};(0,s.useEffect)(()=>{var e;let t,s,n,r=a();return N(r),k("live"===r?"connecting":"snapshot"),P(r).catch(()=>void 0),e=e=>{_(e,"ingest")},t=window,s=t=>{l(t)&&(d(),c(t),e(t))},t.__AUTOMATION_REPORT__={...t.__AUTOMATION_REPORT__,pushDashboard:s},n=e=>{let t=e.data;t?.type==="dashboard.update"&&l(t.payload)&&s(t.payload)},window.addEventListener("message",n),()=>{window.removeEventListener("message",n),t.__AUTOMATION_REPORT__?.pushDashboard===s&&delete t.__AUTOMATION_REPORT__?.pushDashboard}},[]),(0,s.useEffect)(()=>{if("live"!==w){let e=setInterval(()=>{P("static").catch(()=>void 0)},6e4);return()=>clearInterval(e)}let e=null,t=!1,s=null,a=function(e){if("live"!==e)return"";let t="https:"===window.location.protocol?"wss":"ws";return`${t}://${window.location.host}/ws`}("live"),n=()=>{a&&((e=new WebSocket(a)).onopen=()=>k("connected"),e.onclose=()=>{k("reconnecting"),t||(s=setTimeout(n,1200))},e.onerror=()=>k("error"),e.onmessage=e=>{E(e.data),P("live").catch(()=>void 0)})};return n(),()=>{t=!0,s&&clearTimeout(s),e?.close()}},[w]);let D=f.workStatus||m,U=f.report.issues||[],W=(0,s.useMemo)(()=>{let e=$.trim().toLowerCase();return e?U.filter(t=>JSON.stringify(t).toLowerCase().includes(e)):U},[U,$]),G=[D.url?{label:"Evidence",href:D.url}:null,D.pre?{label:D.pre,href:(e=D.pre)&&/^PRE-\d+$/i.test(e)?`https://c24-energie.atlassian.net/browse/${e.toUpperCase()}`:""}:null,D.repo&&D.pr?{label:`${D.repo} #${D.pr}`,href:(r=D.repo,u=D.pr,r&&u?`https://bitbucket.org/check24/${r}/pull-requests/${u}`:"")}:null,D.sentryIssueId?{label:`Sentry ${D.sentryIssueId}`,href:(h=D.sentryIssueId)?`https://check24-energie.sentry.io/issues/${h}/`:""}:null].filter(e=>!!e?.href),B=f.automations.reduce((e,t)=>e+t.activeBlockerCount,0);return(0,t.jsxs)("main",{children:[(0,t.jsxs)("header",{className:"topbar",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"eyebrow",children:D.source||"current work"}),(0,t.jsx)("h1",{children:D.title}),(0,t.jsx)("p",{className:"lead",children:D.message})]}),(0,t.jsxs)("div",{className:"status-grid",children:[(0,t.jsx)("span",{className:`pill ${g(D.status)}`,children:D.status||"unknown"}),(0,t.jsx)("span",{className:`pill ${"connected"===y?"good":"warn"}`,children:"live"===w?`WS ${y}`:"GitHub Pages snapshot"}),(0,t.jsx)("span",{className:`pill ${g(v.status)}`,children:v.status||"health unknown"})]})]}),(0,t.jsxs)("section",{className:"work-hero",children:[(0,t.jsxs)("div",{className:"work-hero_main",children:[(0,t.jsxs)("div",{className:"work-hero_meta",children:[D.step?(0,t.jsxs)("span",{className:"pill neutral",children:["Step ",D.step]}):null,D.phase?(0,t.jsx)("span",{className:"pill neutral",children:D.phase}):null,D.nextStep?(0,t.jsxs)("span",{className:"pill warn",children:["Next ",D.nextStep]}):null,D.agentName?(0,t.jsx)("span",{className:"pill neutral",children:D.agentName}):null]}),(0,t.jsx)("p",{className:"work-hero_target",children:D.pre||D.sentryKey||(D.repo&&D.pr?`${D.repo} #${D.pr}`:"No active target yet")}),D.automationId?(0,t.jsxs)("p",{className:"muted",children:[D.automationId,D.runId?` \xb7 ${D.runId}`:""]}):null]}),(0,t.jsxs)("div",{className:"work-hero_links",children:[0===G.length?(0,t.jsx)("span",{className:"muted",children:"No linked evidence yet."}):null,G.map(e=>(0,t.jsx)("a",{className:"button-link",href:e.href,children:e.label},e.href))]})]}),(0,t.jsxs)("section",{className:"metrics",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Automations"}),(0,t.jsx)("strong",{children:f.automations.length})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Blocked Items"}),(0,t.jsx)("strong",{children:B})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Recent Events"}),(0,t.jsx)("strong",{children:f.recentEvents.length})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Updated"}),(0,t.jsx)("strong",{className:"metric-time",children:x(D.updatedAt)})]})]}),(0,t.jsxs)("section",{className:"toolbar",children:[(0,t.jsxs)("label",{children:["Filter Sentry issues",(0,t.jsx)("input",{value:$,onChange:e=>R(e.target.value),placeholder:"Project, title, culprit, status..."})]}),(0,t.jsx)("button",{onClick:()=>{d(),P(w,!0).catch(()=>void 0)},children:"Refresh"}),(0,t.jsx)("button",{className:"button-danger",disabled:A,onClick:()=>{L().catch(()=>void 0)},children:A?"Clearing…":"Clear report"}),f.report.url?(0,t.jsx)("a",{className:"button-link",href:f.report.url,children:"Open Sentry"}):null]}),(0,t.jsxs)("section",{className:"dashboard-grid",children:[(0,t.jsxs)("section",{className:"panel",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Recent Activity"}),(0,t.jsxs)("span",{className:"muted",children:[f.recentEvents.length," events · max ",200]})]}),(0,t.jsxs)("div",{className:"timeline",children:[0===f.recentEvents.length?(0,t.jsx)("p",{className:"muted",children:"No automation events yet."}):null,f.recentEvents.map(e=>(0,t.jsxs)("article",{className:"timeline-item",children:[(0,t.jsxs)("div",{className:"timeline-item_head",children:[(0,t.jsx)("strong",{children:e.title}),(0,t.jsx)("span",{className:`pill ${g(e.status)}`,children:e.status||"info"})]}),(0,t.jsx)("p",{children:e.message||`${e.automationId} \xb7 ${e.runId}`}),(0,t.jsxs)("div",{className:"timeline-item_meta",children:[e.stepNumber?(0,t.jsxs)("span",{children:["Step ",e.stepNumber]}):null,e.nextStep?(0,t.jsxs)("span",{children:["Next ",e.nextStep]}):null,e.agentName?(0,t.jsx)("span",{children:e.agentName}):null,(0,t.jsx)("span",{children:x(e.createdAt)})]})]},`${e.automationId}-${e.runId}-${e.id}`))]})]}),(0,t.jsxs)("section",{className:"panel",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Automations"}),(0,t.jsxs)("span",{className:"muted",children:[f.automations.length," tracked"]})]}),(0,t.jsxs)("div",{className:"automation-list",children:[0===f.automations.length?(0,t.jsx)("p",{className:"muted",children:"No automations registered yet."}):null,f.automations.map(e=>(0,t.jsxs)("article",{className:"automation-card",children:[(0,t.jsxs)("div",{className:"automation-card_head",children:[(0,t.jsx)("strong",{children:e.automationId}),(0,t.jsx)("span",{className:`pill ${g(e.latestStatus)}`,children:e.latestStatus||"info"})]}),(0,t.jsxs)("div",{className:"automation-card_meta",children:[e.latestRunId?(0,t.jsxs)("span",{children:["Run ",e.latestRunId]}):null,(0,t.jsxs)("span",{children:[e.activeBlockerCount," blocked"]}),(0,t.jsx)("span",{children:x(e.latestUpdateTime)})]})]},e.automationId))]})]})]}),(0,t.jsxs)("section",{className:"panel",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Sentry Issues"}),(0,t.jsxs)("span",{className:"muted",children:[W.length," shown · ",f.report.message]})]}),(0,t.jsxs)("div",{className:"issue-list",children:[0===W.length?(0,t.jsx)("p",{className:"muted",children:"No issues in the current report."}):null,W.map(e=>{let s=e.issueUrl||"";return(0,t.jsxs)("article",{className:"issue",children:[(0,t.jsxs)("div",{className:"issue-main",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"issue-title",children:[(0,t.jsx)("strong",{children:e.title}),e.shortId?(0,t.jsx)("span",{children:e.shortId}):null]}),(0,t.jsx)("p",{children:e.culprit||e.project||"Sentry issue"})]}),(0,t.jsxs)("div",{className:"issue-pills",children:[(0,t.jsx)("span",{className:`pill ${g(e.status||f.report.status)}`,children:e.status||"unresolved"}),e.level?(0,t.jsx)("span",{className:`pill ${g(e.level)}`,children:e.level}):null]})]}),(0,t.jsxs)("div",{className:"issue-meta",children:[e.project?(0,t.jsx)("span",{children:e.project}):null,e.lastSeen?(0,t.jsxs)("span",{children:["Last ",x(e.lastSeen)]}):null,s?(0,t.jsx)("a",{href:s,children:"View"}):null]})]},e.id)})]})]}),(0,t.jsx)(p,{}),(0,t.jsxs)("footer",{children:[(0,t.jsx)("span",{children:"live"===w?`Store v${v.storeVersion??0}: ${v.storePath||"not loaded"}`:`Data source: ${T}`}),(0,t.jsx)("span",{children:"live"===w?`WS clients ${v.websocket?.clients??0}; last ${I.slice(0,140)}`:`Snapshot updated ${x(D.updatedAt)}`})]})]})}],31713)}]);