import{t as C,e as S,a as x}from"./assets/fingerprint-C6cHTPuf.js";function E(e){return`Title:
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
${e.notes.slice(0,1500)}`}function I(e,t,a){const n=a.map((r,o)=>`MATCH ${o+1}
Submission: ${r.sourceUrl}
Language: ${r.language}
Scores: total=${r.totalScore.toFixed(2)}, logic=${r.logicalScore.toFixed(2)}, token=${r.tokenScore.toFixed(2)}, style=${r.styleScore.toFixed(2)}
Reason: ${r.reason}
Logic tags: ${r.logicFingerprint.approachTags.join(", ")||"none"}
Data structures: ${r.logicFingerprint.dataStructures.join(", ")||"none"}
Control flow: ${r.logicFingerprint.controlFlowShape.join(", ")||"none"}
State variables: ${r.logicFingerprint.stateVariables.join(", ")||"none"}
Edge signals: ${r.logicFingerprint.edgeCaseSignals.join(", ")||"none"}
Code:
\`\`\`
${r.code.slice(0,1e4)}
\`\`\``).join(`

`);return`You are upSol, a strict logic-first Codeforces Wrong Answer debugger.

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
${E(t)}

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
}`}function T(e){const t=e[0];return t?.isFallback?{summary:"Codeforces did not expose accepted source code to the extension, so this run could not compare against real accepted submissions.",intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"Accepted-code matching is unavailable for this page/run.",failingLogic:"The failed code was scraped successfully, but the accepted-submission collector returned no readable source pages.",logicDivergence:"",matchedSolutionReason:"The displayed match is a fallback anchor, not a real accepted solution.",counterexample:"",suggestedFix:"Stay logged in to Codeforces, reload the extension, and try again. If accepted code is still blocked, use ChatGPT/Ollama mode with the problem statement and failed code only.",patchGuidance:"",counterexamplePattern:"Needs AI reasoning or readable accepted submissions.",confidence:"low"}:{summary:"AI explanation was not requested. The extension completed logic-first matching and selected the closest accepted submissions.",intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"Enable OpenAI or Ollama settings to get a line/block-level explanation.",failingLogic:t?`Best current match: ${t.reason}`:"No accepted submissions were collected.",logicDivergence:"",matchedSolutionReason:t?`Top match scored ${(t.totalScore*100).toFixed(0)}% overall, with ${(t.logicalScore*100).toFixed(0)}% logical similarity.`:"No match available.",counterexample:"",suggestedFix:"Review the top matched accepted code and compare the condition branches, state updates, and edge-case handling.",patchGuidance:"",counterexamplePattern:"AI provider required for counterexample-pattern inference.",confidence:t?"medium":"low"}}function b(e){const t=e.match(/\{[\s\S]*\}/)?.[0]??e;try{const a=JSON.parse(t);return{summary:a.summary??e,intendedAlgorithm:a.intendedAlgorithm??"",acceptedAlgorithm:a.acceptedAlgorithm??"",bugLocation:a.bugLocation??"",failingLogic:a.failingLogic??"",logicDivergence:a.logicDivergence??"",matchedSolutionReason:a.matchedSolutionReason??"",counterexample:a.counterexample??"",suggestedFix:a.suggestedFix??"",patchGuidance:a.patchGuidance??"",counterexamplePattern:a.counterexamplePattern??"",confidence:a.confidence??"unknown"}}catch{return{summary:e,intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"",failingLogic:"",logicDivergence:"",matchedSolutionReason:"",counterexample:"",suggestedFix:"",patchGuidance:"",counterexamplePattern:"",confidence:"unknown"}}}async function v(e,t,a,n){if(n.provider==="none")return T(a);const r=I(e,t,a);if(n.provider==="openai"){const i=(n.openaiApiKey||n.apiKey).trim();if(!i)throw new Error("OpenAI API key is missing.");const c=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({model:n.model||"gpt-4o-mini",messages:[{role:"user",content:r}],temperature:.2})});if(!c.ok)throw new Error(`OpenAI request failed: ${c.status}`);const l=await c.json();return b(l.choices?.[0]?.message?.content??"")}if(n.provider==="gemini"){const i=(n.geminiApiKey||n.apiKey).trim();if(!i)throw new Error("Gemini API key is missing.");const c=n.model||"gemini-2.5-flash-lite",l=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c)}:generateContent?key=${encodeURIComponent(i)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:r}]}],generationConfig:{temperature:.2,responseMimeType:"application/json"}})});if(!l.ok){const u=await l.text().catch(()=>"");throw new Error(`Gemini request failed: ${l.status}${u?` - ${u.slice(0,180)}`:""}`)}const d=(await l.json()).candidates?.[0]?.content?.parts?.map(u=>u.text??"").join("")??"";return b(d)}if(n.provider==="claude")throw new Error("Claude provider is selected, but Claude API integration has not been implemented yet.");if(n.provider==="nano")throw new Error("Chrome Gemini Nano provider is selected, but built-in AI integration has not been implemented yet.");let o;try{o=await fetch(n.ollamaUrl||"http://localhost:11434/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:n.model||"qwen2.5-coder:7b",prompt:r,stream:!1,options:{temperature:.2}})})}catch{throw new Error("Could not connect to Ollama. Start Ollama and run: ollama run qwen2.5-coder:7b")}if(!o.ok)throw o.status===403?new Error("Ollama returned 403. Allow Chrome extension origins, restart Ollama, then retry: set OLLAMA_ORIGINS=chrome-extension://*"):new Error(`Ollama request failed: ${o.status}. Make sure the model is installed with: ollama run ${n.model||"qwen2.5-coder:7b"}`);const s=await o.json();return b(s.response??"")}function k(e){return new DOMParser().parseFromString(e,"text/html")}function g(e){return e.replace(/\u00a0/g," ").replace(/\s+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}async function F(e,t){const a=`https://codeforces.com/problemset/problem/${e}/${t}`,n=await fetch(a,{credentials:"include"}).then(u=>{if(!u.ok)throw new Error(`Problem page fetch failed: ${u.status}`);return u.text()}),o=k(n).querySelector(".problem-statement"),s=g(o?.querySelector(".title")?.textContent??`Problem ${e}${t}`),i=g(o?.querySelector(".input-specification")?.textContent??""),c=g(o?.querySelector(".output-specification")?.textContent??""),l=Array.from(o?.querySelectorAll(".sample-tests .input, .sample-tests .output")??[]).map(u=>g(u.textContent??"")),p=g(o?.querySelector(".note")?.textContent??""),d=g(o?.textContent??"");return{title:s,statement:d,inputFormat:i,outputFormat:c,examples:l,notes:p,rawText:d,url:a}}function m(e,t){const a=new Set(e),n=new Set(t),r=new Set([...a,...n]);if(!r.size)return 0;let o=0;return a.forEach(s=>{n.has(s)&&(o+=1)}),o/r.size}function A(e,t){const a=m(e.approachTags,t.approachTags),n=m(e.dataStructures,t.dataStructures),r=m(e.controlFlowShape,t.controlFlowShape),o=m(e.stateVariables,t.stateVariables),s=m(e.edgeCaseSignals,t.edgeCaseSignals),i=e.complexityHint===t.complexityHint?1:0;return a*.32+n*.18+r*.18+o*.12+s*.12+i*.08}function P(e,t){return m(C(e),C(t))}function O(e,t){const a=e.language===t.language?1:0,n=e.loopType===t.loopType?1:0,r=e.namingConvention===t.namingConvention?1:0,o=e.usesRecursion===t.usesRecursion?1:0,s=e.verbosity===t.verbosity?1:0,i=m(e.stlUsage,t.stlUsage),c=Math.abs(e.lineCount-t.lineCount),l=Math.max(0,1-c/Math.max(e.lineCount,t.lineCount,1));return a*.18+n*.15+r*.12+o*.1+s*.12+i*.2+l*.13}function L(e,t){return t.filter(a=>A(e,a.logicFingerprint)>=.08||t.length<=5)}function U(e,t,a,n){return L(t,n).map(o=>{const s=A(t,o.logicFingerprint),i=P(e.code,o.code),c=O(a,o.styleFingerprint),l=s*.6+i*.25+c*.15,p=o.logicFingerprint.approachTags.filter(u=>t.approachTags.includes(u)),d=p.length?`Shares ${p.join(", ")} with the failed code.`:"Kept as a weaker fallback because no close logic tags were detected.";return{...o,totalScore:l,logicalScore:s,tokenScore:i,styleScore:c,reason:d}}).sort((o,s)=>s.totalScore-o.totalScore)}const R="upsol.latestAnalysis";function h(e){const t=e.toLowerCase();return t.includes("c++")||t.includes("gcc")||t.includes("clang")?"cpp":t.includes("python")||t.includes("pypy")?"python":t.includes("java")?"java":t.includes("kotlin")?"kotlin":t.includes("rust")?"rust":t.includes("go")?"go":t.includes("c#")?"csharp":t.split(/\s+/)[0]||"unknown"}async function M(){const t=(await new Promise(a=>{chrome.tabs.query({active:!0,currentWindow:!0},a)}))[0]?.id;if(!t)throw new Error("No active tab found.");return t}async function _(){return await new Promise(e=>{chrome.tabs.query({url:"https://codeforces.com/*/submission/*"},e)})}async function N(e){try{if((await chrome.tabs.sendMessage(e,{type:"PING"}))?.ok)return}catch{await chrome.scripting.executeScript({target:{tabId:e},files:["contentScript.js"]})}}async function f(e,t){return await N(e),chrome.tabs.sendMessage(e,t)}async function D(e){await new Promise((t,a)=>{const n=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(r),a(new Error(`Temporary tab ${e} did not finish loading.`))},2e4),r=(o,s)=>{o===e&&s.status==="complete"&&(clearTimeout(n),chrome.tabs.onUpdated.removeListener(r),t())};chrome.tabs.onUpdated.addListener(r)})}async function w(e,t){const n=(await chrome.tabs.create({url:e,active:!1})).id;if(!n)throw new Error(`Could not open temporary tab for ${e}`);try{return await D(n),await new Promise(r=>setTimeout(r,450)),await f(n,t)}catch(r){const o=r instanceof Error?r.message:"unknown error";throw new Error(`Could not scrape ${e}: ${o}`)}finally{await chrome.tabs.remove(n).catch(()=>{})}}async function y(e){await chrome.storage.local.set({[R]:{...e,updatedAt:Date.now()}})}async function j(e){try{return await F(e.contestId,e.problemIndex)}catch{const t=`https://codeforces.com/problemset/problem/${e.contestId}/${e.problemIndex}`;return w(t,{type:"SCRAPE_PROBLEM_STATEMENT"})}}async function q(e){const t=await W(e);if(t.length)return t;const a=[];for(let o=1;o<=8;o+=1)a.push(`https://codeforces.com/contest/${e.contestId}/status/${e.problemIndex}/page/${o}?order=BY_ARRIVED_DESC`),a.push(`https://codeforces.com/problemset/status/${e.contestId}/problem/${e.problemIndex}/page/${o}?order=BY_ARRIVED_DESC`);const n=[],r=new Set;for(const o of a)try{const s=await w(o,{type:"SCRAPE_ACCEPTED_META",limit:40});for(const i of s)r.has(i.submissionId)||(r.add(i.submissionId),n.push(i));if(n.length>=80)break}catch(s){console.warn(s)}return n}async function W(e){const t=`https://codeforces.com/api/contest.status?contestId=${e.contestId}&from=1&count=200`;try{const a=await fetch(t).then(async o=>{if(!o.ok)throw new Error(`Codeforces API failed: ${o.status}`);return await o.json()});if(a.status!=="OK"||!a.result)return[];const n=new Set,r=[];for(const o of a.result){if(!(String(o.problem?.contestId??e.contestId)===e.contestId&&o.problem?.index?.toUpperCase()===e.problemIndex.toUpperCase())||o.verdict!=="OK")continue;const i=String(o.id);if(!n.has(i)&&(n.add(i),r.push({submissionId:i,userHandle:o.author?.members?.[0]?.handle??o.author?.participantType??"unknown",language:o.programmingLanguage??"Unknown language",sourceUrl:`https://codeforces.com/contest/${e.contestId}/submission/${i}`}),r.length>=80))break}return r}catch(a){return console.warn(a),[]}}async function B(e){const t=await G(e);if(t.length>=1)return t.slice(0,3);const a=await q(e);if(!a.length)throw new Error(`No accepted rows were found on Codeforces status pages for ${e.contestId}${e.problemIndex}.`);const n=h(e.language),r=a.filter(i=>h(i.language)===n);if(n!=="unknown"&&!r.length)throw new Error(`Accepted rows were found, but none matched the failed submission language family (${e.language}).`);const o=(n==="unknown"?a:r).slice(0,60),s=[];for(const i of o)try{const c=await w(i.sourceUrl,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!c.code)continue;if(s.push({...c,userHandle:c.userHandle||i.userHandle,language:c.language==="Unknown language"?i.language:c.language,logicFingerprint:S(c.code),styleFingerprint:x(c.code,c.language==="Unknown language"?i.language:c.language)}),s.length>=3)break}catch(c){console.warn(c)}return s.filter(i=>n==="unknown"||h(i.language)===n)}async function G(e){const t=await _(),a=[],n=h(e.language),r=e.submissionId;for(const o of t)if(!(!o.id||!o.url)&&!(r&&o.url.includes(`/submission/${r}`))&&o.url.includes(`/contest/${e.contestId}/submission/`))try{const s=await f(o.id,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!s.code)continue;const i=s.language==="Unknown language"?e.language:s.language;if(n!=="unknown"&&h(i)!==n)continue;if(a.push({...s,language:i,logicFingerprint:S(s.code),styleFingerprint:x(s.code,i)}),a.length>=3)break}catch(s){console.warn(s)}return a}function H(e){return e?e.replace(/_/g," ").toLowerCase():""}async function K(e){if(!e.viewerHandle)throw new Error("This problem page was detected, but upSol could not find your Codeforces handle. Sign in to Codeforces, then try again from the problem page.");const t=`https://codeforces.com/api/user.status?handle=${encodeURIComponent(e.viewerHandle)}&from=1&count=500`,a=await fetch(t).then(async s=>{if(!s.ok)throw new Error(`Codeforces user status failed: ${s.status}`);return await s.json()});if(a.status!=="OK"||!a.result)throw new Error(a.comment??"Codeforces did not return your recent submissions.");const n=a.result.filter(s=>String(s.problem?.contestId??"")===e.contestId&&s.problem?.index?.toUpperCase()===e.problemIndex.toUpperCase()&&H(s.verdict).includes("wrong answer")).sort((s,i)=>(i.creationTimeSeconds??0)-(s.creationTimeSeconds??0))[0];if(!n)throw new Error(`No recent Wrong Answer submission was found for ${e.contestId}${e.problemIndex} under ${e.viewerHandle}.`);const r=`https://codeforces.com/contest/${e.contestId}/submission/${n.id}`,o=await w(r,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!o.code)throw new Error(`Found submission ${n.id}, but Codeforces did not expose its source code in this session.`);return{url:r,contestId:e.contestId,problemIndex:e.problemIndex,submissionId:String(n.id),verdict:n.verdict?n.verdict.replace(/_/g," "):"Wrong answer",language:n.programmingLanguage??o.language??"Unknown language",code:o.code}}async function V(e){await y({status:"running"});const t=await M(),a=await f(t,{type:"DETECT_ANALYZABLE_PAGE"});if(!a.ok)throw new Error(a.reason);const n=a.pageType==="problem"?await f(t,{type:"SCRAPE_PROBLEM_PAGE_CONTEXT"}):null,r=a.pageType==="problem"&&n?await K(n):await f(t,{type:"SCRAPE_FAILED_CODE"});if(!r.code)throw new Error("Failed source code was not found on the page.");if(!r.contestId||!r.problemIndex)throw new Error("Could not detect contest ID or problem index from this submission.");const o=n?.problemStatement?.rawText||n?.problemStatement?.statement?n.problemStatement:await j(r);let s=[];try{s=await B(r)}catch(u){const $=u instanceof Error?u.message:"Unknown accepted-submission collector error.";throw new Error(`Step 4 failed: ${$}`)}if(!s.length)throw new Error("No accepted source code could be collected. Codeforces blocked or hid the accepted submission source pages in this browser session.");const i=S(r.code),c=x(r.code,r.language),l=U(r,i,c,s).slice(0,3),p=await v(r,o,l,e),d={failedSubmission:r,problemStatement:o,acceptedSubmissions:s,matchedSubmissions:l,explanation:p};return await y({status:"complete",result:d}),d}chrome.runtime.onMessage.addListener((e,t,a)=>{const n=e;if(n.type==="ANALYZE_CURRENT_TAB")return V(n.settings).then(r=>a({ok:!0,result:r})).catch(async r=>{const o=r instanceof Error?r.message:"Unknown analysis error.";await y({status:"error",error:o}),a({ok:!1,error:o})}),!0});
