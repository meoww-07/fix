import{t as A,e as y,a as S}from"./assets/fingerprint-C6cHTPuf.js";function C(e){return`Title:
${e.title}

Statement:
${e.statement.slice(0,4500)}

Input format:
${e.inputFormat.slice(0,1500)}

Output format:
${e.outputFormat.slice(0,1500)}

Examples:
${e.examples.slice(0,6).join(`

`).slice(0,2500)}

Notes:
${e.notes.slice(0,1500)}`}function E(e,t,r){const n=r.map((a,o)=>`MATCH ${o+1}
Submission: ${a.sourceUrl}
Language: ${a.language}
Scores: total=${a.totalScore.toFixed(2)}, logic=${a.logicalScore.toFixed(2)}, token=${a.tokenScore.toFixed(2)}, style=${a.styleScore.toFixed(2)}
Reason: ${a.reason}
Logic tags: ${a.logicFingerprint.approachTags.join(", ")||"none"}
Data structures: ${a.logicFingerprint.dataStructures.join(", ")||"none"}
Control flow: ${a.logicFingerprint.controlFlowShape.join(", ")||"none"}
State variables: ${a.logicFingerprint.stateVariables.join(", ")||"none"}
Edge signals: ${a.logicFingerprint.edgeCaseSignals.join(", ")||"none"}
Code:
\`\`\`
${a.code.slice(0,1e4)}
\`\`\``).join(`

`);return`You are VerdictIQ, a strict logic-first Codeforces Wrong Answer debugger.

Your task:
Find why the FAILED submission got WA by comparing it against the TOP MATCHED ACCEPTED submissions.
The user is a beginner/intermediate competitive programmer. Explain the smallest logic mistake, not a full rewrite.

Hard rules:
1. Use only the failed code, problem statement, and accepted submissions below.
2. Do not invent a different algorithm unless it is clearly used by an accepted submission.
3. Match logic before style. Variable names and formatting are secondary.
4. Identify the user's intended algorithm first.
5. Compare the failed code against the closest accepted code at the level of conditions, state updates, loops, and edge cases.
6. Prefer a minimal fix that preserves the user's approach.
7. If you cannot infer an exact counterexample, give a counterexample pattern, not a fake exact input.
8. Do not provide a full replacement solution unless the user's approach is unrecoverable.
9. Keep explanations concrete and tied to code blocks/conditions.
10. Return only valid JSON. No Markdown outside JSON.

Failed submission:
URL: ${e.url}
Verdict: ${e.verdict}
Language: ${e.language}
Problem: ${e.contestId}${e.problemIndex}

Problem statement:
${C(t)}

Failed code:
\`\`\`
${e.code.slice(0,12e3)}
\`\`\`

Top logically matched accepted submissions:
${n}

Analyze in this order internally:
1. What is the problem asking?
2. What algorithm/reasoning is the failed code attempting?
3. Which accepted match is logically closest?
4. What condition, loop invariant, state update, or edge-case differs?
5. Why does that difference cause WA?
6. What is the smallest fix?

Return exactly this JSON object:
{
  "summary": "2-3 sentence explanation of the WA cause.",
  "intendedAlgorithm": "What the failed code is trying to do.",
  "acceptedAlgorithm": "What the closest accepted submission does logically.",
  "bugLocation": "Specific condition/loop/state update/block in the failed code.",
  "failingLogic": "Why the failed code's logic is wrong.",
  "logicDivergence": "The exact difference between failed code and accepted code.",
  "matchedSolutionReason": "Why the top accepted match is relevant.",
  "counterexample": "Small exact input if you are confident; otherwise empty string.",
  "counterexamplePattern": "Pattern of cases that break the failed logic.",
  "suggestedFix": "Minimal logic-level fix, preserving the user's approach.",
  "patchGuidance": "Concrete implementation guidance without rewriting the full solution.",
  "confidence": "high | medium | low"
}`}function v(e){const t=e[0];return t?.isFallback?{summary:"Codeforces did not expose accepted source code to the extension, so this run could not compare against real accepted submissions.",intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"Accepted-code matching is unavailable for this page/run.",failingLogic:"The failed code was scraped successfully, but the accepted-submission collector returned no readable source pages.",logicDivergence:"",matchedSolutionReason:"The displayed match is a fallback anchor, not a real accepted solution.",counterexample:"",suggestedFix:"Stay logged in to Codeforces, reload the extension, and try again. If accepted code is still blocked, use ChatGPT/Ollama mode with the problem statement and failed code only.",patchGuidance:"",counterexamplePattern:"Needs AI reasoning or readable accepted submissions.",confidence:"low"}:{summary:"AI explanation was not requested. The extension completed logic-first matching and selected the closest accepted submissions.",intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"Enable OpenAI or Ollama settings to get a line/block-level explanation.",failingLogic:t?`Best current match: ${t.reason}`:"No accepted submissions were collected.",logicDivergence:"",matchedSolutionReason:t?`Top match scored ${(t.totalScore*100).toFixed(0)}% overall, with ${(t.logicalScore*100).toFixed(0)}% logical similarity.`:"No match available.",counterexample:"",suggestedFix:"Review the top matched accepted code and compare the condition branches, state updates, and edge-case handling.",patchGuidance:"",counterexamplePattern:"AI provider required for counterexample-pattern inference.",confidence:t?"medium":"low"}}function w(e){const t=e.match(/\{[\s\S]*\}/)?.[0]??e;try{const r=JSON.parse(t);return{summary:r.summary??e,intendedAlgorithm:r.intendedAlgorithm??"",acceptedAlgorithm:r.acceptedAlgorithm??"",bugLocation:r.bugLocation??"",failingLogic:r.failingLogic??"",logicDivergence:r.logicDivergence??"",matchedSolutionReason:r.matchedSolutionReason??"",counterexample:r.counterexample??"",suggestedFix:r.suggestedFix??"",patchGuidance:r.patchGuidance??"",counterexamplePattern:r.counterexamplePattern??"",confidence:r.confidence??"unknown"}}catch{return{summary:e,intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"",failingLogic:"",logicDivergence:"",matchedSolutionReason:"",counterexample:"",suggestedFix:"",patchGuidance:"",counterexamplePattern:"",confidence:"unknown"}}}async function T(e,t,r,n){if(n.provider==="none")return v(r);const a=E(e,t,r);if(n.provider==="openai"){const s=(n.openaiApiKey||n.apiKey).trim();if(!s)throw new Error("OpenAI API key is missing.");const c=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({model:n.model||"gpt-4o-mini",messages:[{role:"user",content:a}],temperature:.2})});if(!c.ok)throw new Error(`OpenAI request failed: ${c.status}`);const l=await c.json();return w(l.choices?.[0]?.message?.content??"")}if(n.provider==="gemini"){const s=(n.geminiApiKey||n.apiKey).trim();if(!s)throw new Error("Gemini API key is missing.");const c=n.model||"gemini-2.5-flash-lite",l=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c)}:generateContent?key=${encodeURIComponent(s)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:a}]}],generationConfig:{temperature:.2,responseMimeType:"application/json"}})});if(!l.ok){const u=await l.text().catch(()=>"");throw new Error(`Gemini request failed: ${l.status}${u?` - ${u.slice(0,180)}`:""}`)}const d=(await l.json()).candidates?.[0]?.content?.parts?.map(u=>u.text??"").join("")??"";return w(d)}if(n.provider==="claude")throw new Error("Claude provider is selected, but Claude API integration has not been implemented yet.");if(n.provider==="nano")throw new Error("Chrome Gemini Nano provider is selected, but built-in AI integration has not been implemented yet.");let o;try{o=await fetch(n.ollamaUrl||"http://localhost:11434/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:n.model||"qwen2.5-coder:7b",prompt:a,stream:!1,options:{temperature:.2}})})}catch{throw new Error("Could not connect to Ollama. Start Ollama and run: ollama run qwen2.5-coder:7b")}if(!o.ok)throw o.status===403?new Error("Ollama returned 403. Allow Chrome extension origins, restart Ollama, then retry: set OLLAMA_ORIGINS=chrome-extension://*"):new Error(`Ollama request failed: ${o.status}. Make sure the model is installed with: ollama run ${n.model||"qwen2.5-coder:7b"}`);const i=await o.json();return w(i.response??"")}function k(e){return new DOMParser().parseFromString(e,"text/html")}function g(e){return e.replace(/\u00a0/g," ").replace(/\s+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}async function I(e,t){const r=`https://codeforces.com/problemset/problem/${e}/${t}`,n=await fetch(r,{credentials:"include"}).then(u=>{if(!u.ok)throw new Error(`Problem page fetch failed: ${u.status}`);return u.text()}),o=k(n).querySelector(".problem-statement"),i=g(o?.querySelector(".title")?.textContent??`Problem ${e}${t}`),s=g(o?.querySelector(".input-specification")?.textContent??""),c=g(o?.querySelector(".output-specification")?.textContent??""),l=Array.from(o?.querySelectorAll(".sample-tests .input, .sample-tests .output")??[]).map(u=>g(u.textContent??"")),p=g(o?.querySelector(".note")?.textContent??""),d=g(o?.textContent??"");return{title:i,statement:d,inputFormat:s,outputFormat:c,examples:l,notes:p,rawText:d,url:r}}function m(e,t){const r=new Set(e),n=new Set(t),a=new Set([...r,...n]);if(!a.size)return 0;let o=0;return r.forEach(i=>{n.has(i)&&(o+=1)}),o/a.size}function $(e,t){const r=m(e.approachTags,t.approachTags),n=m(e.dataStructures,t.dataStructures),a=m(e.controlFlowShape,t.controlFlowShape),o=m(e.stateVariables,t.stateVariables),i=m(e.edgeCaseSignals,t.edgeCaseSignals),s=e.complexityHint===t.complexityHint?1:0;return r*.32+n*.18+a*.18+o*.12+i*.12+s*.08}function F(e,t){return m(A(e),A(t))}function P(e,t){const r=e.language===t.language?1:0,n=e.loopType===t.loopType?1:0,a=e.namingConvention===t.namingConvention?1:0,o=e.usesRecursion===t.usesRecursion?1:0,i=e.verbosity===t.verbosity?1:0,s=m(e.stlUsage,t.stlUsage),c=Math.abs(e.lineCount-t.lineCount),l=Math.max(0,1-c/Math.max(e.lineCount,t.lineCount,1));return r*.18+n*.15+a*.12+o*.1+i*.12+s*.2+l*.13}function O(e,t){return t.filter(r=>$(e,r.logicFingerprint)>=.08||t.length<=5)}function L(e,t,r,n){return O(t,n).map(o=>{const i=$(t,o.logicFingerprint),s=F(e.code,o.code),c=P(r,o.styleFingerprint),l=i*.6+s*.25+c*.15,p=o.logicFingerprint.approachTags.filter(u=>t.approachTags.includes(u)),d=p.length?`Shares ${p.join(", ")} with the failed code.`:"Kept as a weaker fallback because no close logic tags were detected.";return{...o,totalScore:l,logicalScore:i,tokenScore:s,styleScore:c,reason:d}}).sort((o,i)=>i.totalScore-o.totalScore)}const R="verdictiq.latestAnalysis";function h(e){const t=e.toLowerCase();return t.includes("c++")||t.includes("gcc")||t.includes("clang")?"cpp":t.includes("python")||t.includes("pypy")?"python":t.includes("java")?"java":t.includes("kotlin")?"kotlin":t.includes("rust")?"rust":t.includes("go")?"go":t.includes("c#")?"csharp":t.split(/\s+/)[0]||"unknown"}async function U(){const t=(await new Promise(r=>{chrome.tabs.query({active:!0,currentWindow:!0},r)}))[0]?.id;if(!t)throw new Error("No active tab found.");return t}async function D(){return await new Promise(e=>{chrome.tabs.query({url:"https://codeforces.com/*/submission/*"},e)})}async function N(e){try{if((await chrome.tabs.sendMessage(e,{type:"PING"}))?.ok)return}catch{await chrome.scripting.executeScript({target:{tabId:e},files:["contentScript.js"]})}}async function f(e,t){return await N(e),chrome.tabs.sendMessage(e,t)}async function M(e){await new Promise((t,r)=>{const n=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(a),r(new Error(`Temporary tab ${e} did not finish loading.`))},2e4),a=(o,i)=>{o===e&&i.status==="complete"&&(clearTimeout(n),chrome.tabs.onUpdated.removeListener(a),t())};chrome.tabs.onUpdated.addListener(a)})}async function x(e,t){const n=(await chrome.tabs.create({url:e,active:!1})).id;if(!n)throw new Error(`Could not open temporary tab for ${e}`);try{return await M(n),await new Promise(a=>setTimeout(a,450)),await f(n,t)}catch(a){const o=a instanceof Error?a.message:"unknown error";throw new Error(`Could not scrape ${e}: ${o}`)}finally{await chrome.tabs.remove(n).catch(()=>{})}}async function b(e){await chrome.storage.local.set({[R]:{...e,updatedAt:Date.now()}})}async function _(e){try{return await I(e.contestId,e.problemIndex)}catch{const t=`https://codeforces.com/problemset/problem/${e.contestId}/${e.problemIndex}`;return x(t,{type:"SCRAPE_PROBLEM_STATEMENT"})}}async function j(e){const t=await q(e);if(t.length)return t;const r=[];for(let o=1;o<=8;o+=1)r.push(`https://codeforces.com/contest/${e.contestId}/status/${e.problemIndex}/page/${o}?order=BY_ARRIVED_DESC`),r.push(`https://codeforces.com/problemset/status/${e.contestId}/problem/${e.problemIndex}/page/${o}?order=BY_ARRIVED_DESC`);const n=[],a=new Set;for(const o of r)try{const i=await x(o,{type:"SCRAPE_ACCEPTED_META",limit:40});for(const s of i)a.has(s.submissionId)||(a.add(s.submissionId),n.push(s));if(n.length>=80)break}catch(i){console.warn(i)}return n}async function q(e){const t=`https://codeforces.com/api/contest.status?contestId=${e.contestId}&from=1&count=200`;try{const r=await fetch(t).then(async o=>{if(!o.ok)throw new Error(`Codeforces API failed: ${o.status}`);return await o.json()});if(r.status!=="OK"||!r.result)return[];const n=new Set,a=[];for(const o of r.result){if(!(String(o.problem?.contestId??e.contestId)===e.contestId&&o.problem?.index?.toUpperCase()===e.problemIndex.toUpperCase())||o.verdict!=="OK")continue;const s=String(o.id);if(!n.has(s)&&(n.add(s),a.push({submissionId:s,userHandle:o.author?.members?.[0]?.handle??o.author?.participantType??"unknown",language:o.programmingLanguage??"Unknown language",sourceUrl:`https://codeforces.com/contest/${e.contestId}/submission/${s}`}),a.length>=80))break}return a}catch(r){return console.warn(r),[]}}async function W(e){const t=await G(e);if(t.length>=1)return t.slice(0,3);const r=await j(e);if(!r.length)throw new Error(`No accepted rows were found on Codeforces status pages for ${e.contestId}${e.problemIndex}.`);const n=h(e.language),a=r.filter(s=>h(s.language)===n);if(n!=="unknown"&&!a.length)throw new Error(`Accepted rows were found, but none matched the failed submission language family (${e.language}).`);const o=(n==="unknown"?r:a).slice(0,60),i=[];for(const s of o)try{const c=await x(s.sourceUrl,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!c.code)continue;if(i.push({...c,userHandle:c.userHandle||s.userHandle,language:c.language==="Unknown language"?s.language:c.language,logicFingerprint:y(c.code),styleFingerprint:S(c.code,c.language==="Unknown language"?s.language:c.language)}),i.length>=3)break}catch(c){console.warn(c)}return i.filter(s=>n==="unknown"||h(s.language)===n)}async function G(e){const t=await D(),r=[],n=h(e.language),a=e.submissionId;for(const o of t)if(!(!o.id||!o.url)&&!(a&&o.url.includes(`/submission/${a}`))&&o.url.includes(`/contest/${e.contestId}/submission/`))try{const i=await f(o.id,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!i.code)continue;const s=i.language==="Unknown language"?e.language:i.language;if(n!=="unknown"&&h(s)!==n)continue;if(r.push({...i,language:s,logicFingerprint:y(i.code),styleFingerprint:S(i.code,s)}),r.length>=3)break}catch(i){console.warn(i)}return r}async function B(e){await b({status:"running"});const t=await U(),r=await f(t,{type:"DETECT_WRONG_ANSWER_PAGE"});if(!r.ok)throw new Error(r.reason);const n=await f(t,{type:"SCRAPE_FAILED_CODE"});if(!n.code)throw new Error("Failed source code was not found on the page.");if(!n.contestId||!n.problemIndex)throw new Error("Could not detect contest ID or problem index from this submission.");const a=await _(n);let o=[];try{o=await W(n)}catch(d){const u=d instanceof Error?d.message:"Unknown accepted-submission collector error.";throw new Error(`Step 4 failed: ${u}`)}if(!o.length)throw new Error("No accepted source code could be collected. Codeforces blocked or hid the accepted submission source pages in this browser session.");const i=y(n.code),s=S(n.code,n.language),c=L(n,i,s,o).slice(0,3),l=await T(n,a,c,e),p={failedSubmission:n,problemStatement:a,acceptedSubmissions:o,matchedSubmissions:c,explanation:l};return await b({status:"complete",result:p}),p}chrome.runtime.onMessage.addListener((e,t,r)=>{const n=e;if(n.type==="ANALYZE_CURRENT_TAB")return B(n.settings).then(a=>r({ok:!0,result:a})).catch(async a=>{const o=a instanceof Error?a.message:"Unknown analysis error.";await b({status:"error",error:o}),r({ok:!1,error:o})}),!0});
