(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31713,e=>{"use strict";var t=e.i(43476),s=e.i(71645);function a(){let e=new Date().toISOString();return{workStatus:{status:"pending",title:"Waiting for work status",message:"Paste work-status JSON into the Log work status field at the bottom of this page.",source:"automation-report",updatedAt:e},automations:[],recentEvents:[],report:{title:"Check24 Sentry Issues",message:"Waiting for the first Sentry refresh.",status:"pending",updatedAt:e,issueCount:0,issues:[]}}}let n="automation-report-dashboard-v1",r="automation-report-cleared-v1";function o(e){return!!e&&"object"==typeof e&&!!(e.workStatus&&e.report)}function l(){try{let e=window.localStorage.getItem(n);if(!e)return null;let t=JSON.parse(e);if(o(t))return t}catch{}return null}function i(e){window.localStorage.setItem(n,JSON.stringify(e))}function c(){window.localStorage.removeItem(r)}function d(e){return{...e,automations:e.automations||[],recentEvents:e.recentEvents||[],report:e.report||a().report,workStatus:e.workStatus||a().workStatus}}function u(e){let t=d(e);return c(),i(t),{snapshot:t,source:"ingest"}}let p={"claude code":"Claude",claude:"Claude",codex:"Codex",cursor:"Cursor"};function m(e,t=120){if(null==e)return;let s=String(e).replace(/\s+/g," ").trim();if(s)return s.slice(0,t)}function h(e){return"number"==typeof e&&Number.isFinite(e)&&e>=0?Math.round(e):"string"==typeof e&&/^\d+$/.test(e.trim())?Number(e.trim()):void 0}function g({dashboard:e,onUpdated:n}){let[r,o]=(0,s.useState)(""),[l,i]=(0,s.useState)(""),c=()=>{let t=r.trim();if(!t)return void i("JSON is required.");try{let s,r,l,c,d,g,x,k,N,j,b,w,f,v,S,y,C,T,I=JSON.parse(t),O=I&&"object"==typeof I&&I.workStatus&&I.report&&Array.isArray(I.automations)&&Array.isArray(I.recentEvents)?I:I&&"object"==typeof I&&"string"==typeof I.status&&"string"==typeof I.message?(s=e||a(),r=new Date().toISOString(),l=function(e){let t=e.appName||e.app||e.agentName||e.agent;if("string"!=typeof t)return;let s=t.trim();if(s)return p[s.toLowerCase()]||s}(I),c=m(I.llm||I.model||I.modelName,120),d=m(I.modelToken,120),g=I.token,x=h(I.tokensUsed??I.tokenUsed??I.tokens),!(!(k=d)&&"string"==typeof g&&g.trim())||/^\d+$/.test(g.trim())||(k=m(g,120)),N=h(g),j={llm:c||k,modelToken:k,tokensUsed:x??N},w=(b={...I,title:I.title||I.message,updatedAt:I.updatedAt||r,...l?{appName:l,agentName:l}:{},...j}).automationId||s.workStatus?.automationId||"manual",f=b.runId||s.workStatus?.runId||r.replace(/[:.]/g,"-"),v={id:`evt-${r}`,title:b.title,status:b.status,message:b.message,stepNumber:b.step,nextStep:b.nextStep,appName:b.appName||b.agentName,agentName:b.appName||b.agentName,llm:b.llm,modelToken:b.modelToken,tokensUsed:b.tokensUsed,createdAt:r,automationId:w,runId:f},y=(S=[...s.automations]).findIndex(e=>e.automationId===w),C={automationId:w,latestRunId:f,latestStatus:b.status,latestUpdateTime:r,activeBlockerCount:+("blocked"===b.status)},y>=0?S[y]={...S[y],...C,activeBlockerCount:"blocked"===b.status?(S[y].activeBlockerCount||0)+1:S[y].activeBlockerCount||0}:S.unshift(C),T=[v,...s.recentEvents].slice(0,200),{...s,workStatus:b,automations:S,recentEvents:T,report:s.report}):null;if(!O)return void i("Send dashboard JSON or a workStatus object with status and message.");let A=u(O);n(A.snapshot,A.source),o(""),i("")}catch{i("Invalid JSON.")}};return(0,t.jsxs)("section",{className:"agent-log","aria-label":"Log work status",children:[(0,t.jsx)("label",{className:"agent-log_label",htmlFor:"agent-log-json",children:"Log work status"}),(0,t.jsx)("input",{className:"agent-log_input",id:"agent-log-json",value:r,onChange:e=>o(e.target.value),onKeyDown:e=>{"Enter"===e.key&&(e.preventDefault(),c())},placeholder:'{"status":"running","appName":"Cursor","message":"Applying patch",...}',spellCheck:!1}),(0,t.jsx)("button",{className:"agent-log_submit",type:"button",onClick:c,children:"Submit"}),l?(0,t.jsx)("span",{className:"agent-log_error",children:l}):null]})}function x({label:e,text:a,compact:n=!1}){let[r,o]=(0,s.useState)(!1),l=async()=>{try{await navigator.clipboard.writeText(a),o(!0),window.setTimeout(()=>o(!1),2e3)}catch{window.alert("Could not copy to clipboard.")}};return(0,t.jsxs)("div",{className:"copyable-block",children:[(0,t.jsxs)("div",{className:"copyable-block_head",children:[(0,t.jsx)("p",{className:"muted copyable-block_label",children:e}),(0,t.jsx)("button",{className:"copyable-block_button",type:"button",onClick:()=>void l(),children:r?"Copied":"Copy"})]}),(0,t.jsx)("pre",{className:`instructions_code ${n?"copyable-block_code_compact":"instructions_prompt"}`,children:(0,t.jsx)("code",{children:a})})]})}let k="https://thiennp.github.io/report/",N='{"status":"running","step":"2.1","phase":"cursor","title":"Fix failing test","message":"Updating assertion in user service test","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","tokensUsed":12400,"automationId":"my-repo","runId":"2026-06-08T12:00:00.000Z","nextStep":"2.2"}',j='{"workStatus":{"status":"running","title":"Fix failing test","message":"Updating assertion in user service test","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","tokensUsed":12400,"updatedAt":"2026-06-08T12:00:00.000Z","source":"automation-report"},"automations":[{"automationId":"my-repo","latestRunId":"2026-06-08T12:00:00.000Z","latestStatus":"running","latestUpdateTime":"2026-06-08T12:00:00.000Z","activeBlockerCount":0}],"recentEvents":[{"id":"evt-1","title":"Fix failing test","status":"running","message":"Updating assertion in user service test","stepNumber":"2.1","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","tokensUsed":12400,"createdAt":"2026-06-08T12:00:00.000Z","automationId":"my-repo","runId":"2026-06-08T12:00:00.000Z"}],"report":{"title":"Current report","message":"No external report connected.","status":"pending","updatedAt":"2026-06-08T12:00:00.000Z","issueCount":0,"issues":[]}}',b=`appName values:
- Cursor
- Codex
- Claude
- Other agent app name if different

Every log must include appName.
agentName is also accepted as an alias, but prefer appName.`,w=`LLM and token fields (required on every log):

llm — human-readable model name you are running on
  Examples: Claude 4.5 Sonnet, GPT-5.4, Composer 2.5, Gemini 3 Flash

modelToken — model slug / token id from the agent UI (not an API secret)
  Examples: claude-4.5-sonnet, gpt-5.4, composer-2.5-fast

tokensUsed — optional number of tokens consumed for this step if known

Aliases accepted:
- model or modelName → llm
- token → modelToken when it is a model slug string; token count when it is a number
- tokenUsed or tokens → tokensUsed

Never log API keys, bearer tokens, or other secrets.`,f=`# Automation report logging (all projects)

Dashboard: ${k}
Storage: localStorage in the browser tab that has ${k} open.

You must log what you are doing on every task, in every workspace, without waiting to be asked.

WHEN TO LOG
- Task start, each meaningful step, blocker, retry, success, and completion
- Before and after running commands, editing files, opening PRs, or browser checks
- Whenever status changes: running, success, warning, blocked, pending, error, info

HOW TO LOG
1. Keep ${k} open in the browser (same profile you automate).
2. After each log-worthy step, paste JSON into the bottom "Log work status" field and click Submit (or press Enter).
3. If you control the browser, fill that field directly instead of asking the user.
4. If the report tab is already open, you may also call window.__AUTOMATION_REPORT__.pushDashboard(payload).

PAYLOAD
Prefer a compact work-status object:
${N}

Required fields:
- appName: Cursor | Codex | Claude | your agent app name
- llm: human-readable model name (e.g. Claude 4.5 Sonnet, GPT-5.4)
- modelToken: model slug from the agent UI (e.g. claude-4.5-sonnet) — not an API secret

Also include:
- tokensUsed: token count for this step when known
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start, kept stable for that task
- pre, repo, pr, or url only when known for the active task

RULES
- Log early and often; do not skip logging because the task feels small.
- Always include appName, llm, and modelToken so the dashboard shows which agent and model produced the update.
- Use blocked with a clear next action when stuck.
- Never log API keys or secret bearer tokens.
- Do not require GitHub tokens, repo scripts, or per-project setup.
- This rule applies in every Cursor project.`,v=`AUTOMATION REPORT — AGENT LOGGING PROMPT (ANY AGENT, ANY PROJECT)

Dashboard: ${k}
Storage: localStorage in the browser that has ${k} open

You are an automation agent (Cursor, Codex, Claude Code, or similar). Report your work from the browser. No GitHub token, no server API, and no repository-specific scripts are required.

SETUP FOR CURSOR (ALL PROJECTS)
1. Open Cursor Settings → Rules.
2. Paste the "Cursor user rule" block into User Rules (not Project Rules).
3. User Rules apply to every workspace automatically.
4. Keep ${k} open in a browser tab while the agent works.

SETUP FOR OTHER AGENTS
Paste the same logging rule into that agent's global instructions, system prompt, or automation definition.

WHEN TO LOG
- Task start, each step transition, blocker, success, and terminal state
- After meaningful tool use: shell commands, file edits, tests, deploys, browser actions
- Whenever status changes: running, success, warning, blocked, pending, error, info

PREFERRED — BOTTOM JSON INPUT
1. Open ${k} in the browser.
2. Use the always-visible "Log work status" field at the bottom of the page.
3. Paste JSON into the input.
4. Click Submit or press Enter.

Work-status object example:
${N}

Full dashboard snapshot example:
${j}

IDENTITY FIELDS
- appName: required — Cursor | Codex | Claude | other agent app name
- llm: required — human-readable model name (Claude 4.5 Sonnet, GPT-5.4, Composer 2.5, …)
- modelToken: required — model slug from the agent UI (claude-4.5-sonnet, gpt-5.4, …); not an API secret
- tokensUsed: optional — token count for this step when known
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start
- agentName: optional alias for appName
- pre / repo / pr / url: include only when known for the active task

SYNC RULES
- Data is stored only in this browser profile's localStorage.
- "Clear report" wipes localStorage for this browser only.
- Activity history is capped at 200 events.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Always include appName, llm, and modelToken on every log.
- Never log API keys or secret bearer tokens.
- Prefer the bottom JSON input when browser automation is available.
- Never limit this workflow to one repository or one project.`;function S(){return(0,t.jsxs)("section",{className:"panel instructions",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Agent logging instructions"}),(0,t.jsx)("span",{className:"muted",children:(0,t.jsx)("a",{href:k,children:k})})]}),(0,t.jsxs)("div",{className:"instructions_note",children:[(0,t.jsx)("h3",{className:"instructions_subhead",children:"Cursor — always report in every project"}),(0,t.jsxs)("ol",{className:"instructions_steps",children:[(0,t.jsxs)("li",{children:["Open ",(0,t.jsx)("strong",{children:"Cursor Settings → Rules"}),"."]}),(0,t.jsxs)("li",{children:["Paste the ",(0,t.jsx)("strong",{children:"Cursor user rule"})," below into ",(0,t.jsx)("strong",{children:"User Rules"})," (global), not Project Rules."]}),(0,t.jsxs)("li",{children:["Keep ",k," open in a browser tab while the agent runs."]}),(0,t.jsxs)("li",{children:["The agent logs by pasting JSON with ",(0,t.jsx)("strong",{children:"appName"}),", ",(0,t.jsx)("strong",{children:"llm"}),", and"," ",(0,t.jsx)("strong",{children:"modelToken"})," into the ",(0,t.jsx)("strong",{children:"Log work status"})," field at the bottom of that page."]})]})]}),(0,t.jsx)(x,{label:"Cursor user rule — paste into global User Rules",text:f}),(0,t.jsx)(x,{label:"appName values — include on every log",text:b,compact:!0}),(0,t.jsx)(x,{label:"LLM and token fields — include on every log",text:w,compact:!0}),(0,t.jsx)(x,{label:"Work-status JSON example — paste into Log work status",text:N,compact:!0}),(0,t.jsx)(x,{label:"Full dashboard snapshot example — paste into Log work status",text:j,compact:!0}),(0,t.jsx)(x,{label:"Full agent logging prompt — for Codex, Claude Code, or other agents",text:v})]})}let y={status:"pending",title:"Waiting for work status",message:"Paste work-status JSON into the Log work status field at the bottom of this page.",source:"automation-report",updatedAt:new Date().toISOString()};function C(e){let t=(e||"").toLowerCase();return t.includes("fatal")||t.includes("error")||t.includes("critical")||t.includes("blocked")?"danger":t.includes("warning")||t.includes("warn")||t.includes("pending")?"warn":t.includes("resolved")||t.includes("success")||t.includes("healthy")||t.includes("done")?"good":(t.includes("running")||t.includes("info"),"neutral")}function T(e){if(!e)return"n/a";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleString()}e.s(["default",0,function(){var e,p,m,h;let[x,k]=(0,s.useState)({}),[N,j]=(0,s.useState)(a()),[b,w]=(0,s.useState)("loading"),[f,v]=(0,s.useState)(""),[I,O]=(0,s.useState)(!1),A=(e,t)=>{j({...e,recentEvents:e.recentEvents.slice(0,200)}),w(t)},E=(e=!1)=>{let t=function(e=!1){let t,s,n,o,u=d(a());if(e&&c(),"1"===window.localStorage.getItem(r)&&!e){let e=l();return{snapshot:e?d(e):u,source:"cleared",health:{status:"cleared-local",storeVersion:0}}}let p=l(),m=p?d(p):u;return t=m.workStatus?.title==="Waiting for work status",s=0===m.automations.length,n=0===m.recentEvents.length,o=(m.report?.issueCount??0)===0,t&&s&&n&&o&&!p||i(m),{snapshot:m,source:p?"localStorage":"empty",health:{status:"localStorage",storeVersion:0}}}(e);A(t.snapshot,t.source),k(t.health)},U=async()=>{if(window.confirm("Clear the dashboard? This removes current work, activities, automations, and issues from localStorage in this browser.")){O(!0);try{let e,t=await (window.localStorage.setItem(r,"1"),i(a()),e=d(a()),window.localStorage.removeItem(n),c(),i(e),{snapshot:e});A(t.snapshot,"cleared"),k({status:"cleared-local",storeVersion:0})}catch{window.alert("Could not clear the dashboard cache in this browser.")}finally{O(!1)}}};(0,s.useEffect)(()=>{var e;let t,s,a;return E(),e=e=>{let t=u(e);A(t.snapshot,t.source)},t=window,s=t=>{o(t)&&(c(),i(t),e(t))},t.__AUTOMATION_REPORT__={...t.__AUTOMATION_REPORT__,pushDashboard:s},a=e=>{let t=e.data;t?.type==="dashboard.update"&&o(t.payload)&&s(t.payload)},window.addEventListener("message",a),()=>{window.removeEventListener("message",a),t.__AUTOMATION_REPORT__?.pushDashboard===s&&delete t.__AUTOMATION_REPORT__?.pushDashboard}},[]),(0,s.useEffect)(()=>{let e=e=>{"automation-report-dashboard-v1"===e.key&&E()};return window.addEventListener("storage",e),()=>window.removeEventListener("storage",e)},[]);let R=N.workStatus||y,_=N.report.issues||[],P=(0,s.useMemo)(()=>{let e=f.trim().toLowerCase();return e?_.filter(t=>JSON.stringify(t).toLowerCase().includes(e)):_},[_,f]),L=[R.url?{label:"Evidence",href:R.url}:null,R.pre?{label:R.pre,href:(e=R.pre)&&/^PRE-\d+$/i.test(e)?`https://c24-energie.atlassian.net/browse/${e.toUpperCase()}`:""}:null,R.repo&&R.pr?{label:`${R.repo} #${R.pr}`,href:(p=R.repo,m=R.pr,p&&m?`https://bitbucket.org/check24/${p}/pull-requests/${m}`:"")}:null,R.sentryIssueId?{label:`Sentry ${R.sentryIssueId}`,href:(h=R.sentryIssueId)?`https://check24-energie.sentry.io/issues/${h}/`:""}:null].filter(e=>!!e?.href),$=N.automations.reduce((e,t)=>e+t.activeBlockerCount,0);return(0,t.jsxs)("main",{children:[(0,t.jsxs)("header",{className:"topbar",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"eyebrow",children:R.appName||R.agentName||R.source||"current work"}),(0,t.jsx)("h1",{children:R.title}),(0,t.jsx)("p",{className:"lead",children:R.message})]}),(0,t.jsxs)("div",{className:"status-grid",children:[(0,t.jsx)("span",{className:`pill ${C(R.status)}`,children:R.status||"unknown"}),(0,t.jsx)("span",{className:"pill neutral",children:"localStorage"}),(0,t.jsx)("span",{className:`pill ${C(x.status)}`,children:x.status||"health unknown"})]})]}),(0,t.jsxs)("section",{className:"work-hero",children:[(0,t.jsxs)("div",{className:"work-hero_main",children:[(0,t.jsxs)("div",{className:"work-hero_meta",children:[R.step?(0,t.jsxs)("span",{className:"pill neutral",children:["Step ",R.step]}):null,R.phase?(0,t.jsx)("span",{className:"pill neutral",children:R.phase}):null,R.nextStep?(0,t.jsxs)("span",{className:"pill warn",children:["Next ",R.nextStep]}):null,R.appName||R.agentName?(0,t.jsx)("span",{className:"pill neutral",children:R.appName||R.agentName}):null,R.llm?(0,t.jsx)("span",{className:"pill neutral",children:R.llm}):null,R.modelToken?(0,t.jsx)("span",{className:"pill neutral",children:R.modelToken}):null,"number"==typeof R.tokensUsed?(0,t.jsxs)("span",{className:"pill neutral",children:[R.tokensUsed.toLocaleString()," tokens"]}):null]}),(0,t.jsx)("p",{className:"work-hero_target",children:R.pre||R.sentryKey||(R.repo&&R.pr?`${R.repo} #${R.pr}`:"No active target yet")}),R.automationId?(0,t.jsxs)("p",{className:"muted",children:[R.automationId,R.runId?` \xb7 ${R.runId}`:""]}):null]}),(0,t.jsxs)("div",{className:"work-hero_links",children:[0===L.length?(0,t.jsx)("span",{className:"muted",children:"No linked evidence yet."}):null,L.map(e=>(0,t.jsx)("a",{className:"button-link",href:e.href,children:e.label},e.href))]})]}),(0,t.jsxs)("section",{className:"metrics",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Automations"}),(0,t.jsx)("strong",{children:N.automations.length})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Blocked Items"}),(0,t.jsx)("strong",{children:$})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Recent Events"}),(0,t.jsx)("strong",{children:N.recentEvents.length})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{children:"Updated"}),(0,t.jsx)("strong",{className:"metric-time",children:T(R.updatedAt)})]})]}),(0,t.jsxs)("section",{className:"toolbar",children:[(0,t.jsxs)("label",{children:["Filter Sentry issues",(0,t.jsx)("input",{value:f,onChange:e=>v(e.target.value),placeholder:"Project, title, culprit, status..."})]}),(0,t.jsx)("button",{onClick:()=>E(!0),children:"Refresh"}),(0,t.jsx)("button",{className:"button-danger",disabled:I,onClick:()=>{U().catch(()=>void 0)},children:I?"Clearing…":"Clear report"}),N.report.url?(0,t.jsx)("a",{className:"button-link",href:N.report.url,children:"Open Sentry"}):null]}),(0,t.jsxs)("section",{className:"dashboard-grid",children:[(0,t.jsxs)("section",{className:"panel",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Recent Activity"}),(0,t.jsxs)("span",{className:"muted",children:[N.recentEvents.length," events · max ",200]})]}),(0,t.jsxs)("div",{className:"timeline",children:[0===N.recentEvents.length?(0,t.jsx)("p",{className:"muted",children:"No automation events yet."}):null,N.recentEvents.map(e=>(0,t.jsxs)("article",{className:"timeline-item",children:[(0,t.jsxs)("div",{className:"timeline-item_head",children:[(0,t.jsx)("strong",{children:e.title}),(0,t.jsx)("span",{className:`pill ${C(e.status)}`,children:e.status||"info"})]}),(0,t.jsx)("p",{children:e.message||`${e.automationId} \xb7 ${e.runId}`}),(0,t.jsxs)("div",{className:"timeline-item_meta",children:[e.stepNumber?(0,t.jsxs)("span",{children:["Step ",e.stepNumber]}):null,e.nextStep?(0,t.jsxs)("span",{children:["Next ",e.nextStep]}):null,e.appName||e.agentName?(0,t.jsx)("span",{children:e.appName||e.agentName}):null,e.llm?(0,t.jsx)("span",{children:e.llm}):null,e.modelToken?(0,t.jsx)("span",{children:e.modelToken}):null,"number"==typeof e.tokensUsed?(0,t.jsxs)("span",{children:[e.tokensUsed.toLocaleString()," tokens"]}):null,(0,t.jsx)("span",{children:T(e.createdAt)})]})]},`${e.automationId}-${e.runId}-${e.id}`))]})]}),(0,t.jsxs)("section",{className:"panel",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Automations"}),(0,t.jsxs)("span",{className:"muted",children:[N.automations.length," tracked"]})]}),(0,t.jsxs)("div",{className:"automation-list",children:[0===N.automations.length?(0,t.jsx)("p",{className:"muted",children:"No automations registered yet."}):null,N.automations.map(e=>(0,t.jsxs)("article",{className:"automation-card",children:[(0,t.jsxs)("div",{className:"automation-card_head",children:[(0,t.jsx)("strong",{children:e.automationId}),(0,t.jsx)("span",{className:`pill ${C(e.latestStatus)}`,children:e.latestStatus||"info"})]}),(0,t.jsxs)("div",{className:"automation-card_meta",children:[e.latestRunId?(0,t.jsxs)("span",{children:["Run ",e.latestRunId]}):null,(0,t.jsxs)("span",{children:[e.activeBlockerCount," blocked"]}),(0,t.jsx)("span",{children:T(e.latestUpdateTime)})]})]},e.automationId))]})]})]}),(0,t.jsxs)("section",{className:"panel",children:[(0,t.jsxs)("div",{className:"panel-head",children:[(0,t.jsx)("h2",{children:"Sentry Issues"}),(0,t.jsxs)("span",{className:"muted",children:[P.length," shown · ",N.report.message]})]}),(0,t.jsxs)("div",{className:"issue-list",children:[0===P.length?(0,t.jsx)("p",{className:"muted",children:"No issues in the current report."}):null,P.map(e=>{let s=e.issueUrl||"";return(0,t.jsxs)("article",{className:"issue",children:[(0,t.jsxs)("div",{className:"issue-main",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"issue-title",children:[(0,t.jsx)("strong",{children:e.title}),e.shortId?(0,t.jsx)("span",{children:e.shortId}):null]}),(0,t.jsx)("p",{children:e.culprit||e.project||"Sentry issue"})]}),(0,t.jsxs)("div",{className:"issue-pills",children:[(0,t.jsx)("span",{className:`pill ${C(e.status||N.report.status)}`,children:e.status||"unresolved"}),e.level?(0,t.jsx)("span",{className:`pill ${C(e.level)}`,children:e.level}):null]})]}),(0,t.jsxs)("div",{className:"issue-meta",children:[e.project?(0,t.jsx)("span",{children:e.project}):null,e.lastSeen?(0,t.jsxs)("span",{children:["Last ",T(e.lastSeen)]}):null,s?(0,t.jsx)("a",{href:s,children:"View"}):null]})]},e.id)})]})]}),(0,t.jsx)(S,{}),(0,t.jsx)(g,{dashboard:N,onUpdated:(e,t)=>{A(e,t),k({status:"localStorage",storeVersion:0})}}),(0,t.jsxs)("footer",{children:[(0,t.jsxs)("span",{children:["Storage localStorage · source ",b]}),(0,t.jsxs)("span",{children:["Status ",x.status||"unknown"," · updated ",T(R.updatedAt)]})]})]})}],31713)}]);