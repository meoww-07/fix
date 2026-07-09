import{t as k,e as C,a as $}from"./assets/fingerprint-Gl48dp3f.js";function v(e){return`Title:
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
${e.notes.slice(0,1500)}`}function I(e,o,a){const t=a.map((r,n)=>`MATCH ${n+1}
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
${v(o)}

Failed code:
\`\`\`
${e.code.slice(0,12e3)}
\`\`\`

Top logically matched accepted submissions:
${t}

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
}`}function y(e){const o=e.match(/\{[\s\S]*\}/)?.[0]??e;try{const a=JSON.parse(o);return{summary:a.summary??e,intendedAlgorithm:a.intendedAlgorithm??"",acceptedAlgorithm:a.acceptedAlgorithm??"",bugLocation:a.bugLocation??"",failingLogic:a.failingLogic??"",logicDivergence:a.logicDivergence??"",matchedSolutionReason:a.matchedSolutionReason??"",counterexample:a.counterexample??"",suggestedFix:a.suggestedFix??"",patchGuidance:a.patchGuidance??"",counterexamplePattern:a.counterexamplePattern??"",confidence:a.confidence??"unknown"}}catch{return{summary:e,intendedAlgorithm:"",acceptedAlgorithm:"",bugLocation:"",failingLogic:"",logicDivergence:"",matchedSolutionReason:"",counterexample:"",suggestedFix:"",patchGuidance:"",counterexamplePattern:"",confidence:"unknown"}}}async function T(e,o,a,t){if(t.provider==="none")return null;const r=I(e,o,a);if(t.provider==="openai"||t.provider==="deepseek"||t.provider==="kimi"){const s={openai:{apiKey:t.openaiApiKey||t.apiKey,missingKeyMessage:"OpenAI API key is missing.",endpoint:"https://api.openai.com/v1/chat/completions",defaultModel:"gpt-4o-mini",label:"OpenAI"},deepseek:{apiKey:t.deepseekApiKey||t.apiKey,missingKeyMessage:"DeepSeek API key is missing.",endpoint:"https://api.deepseek.com/chat/completions",defaultModel:"deepseek-v4-flash",label:"DeepSeek"},kimi:{apiKey:t.kimiApiKey||t.apiKey,missingKeyMessage:"Kimi API key is missing.",endpoint:"https://api.moonshot.ai/v1/chat/completions",defaultModel:"kimi-k2.6",label:"Kimi"}}[t.provider],c=s.apiKey.trim();if(!c)throw new Error(s.missingKeyMessage);const l=await fetch(s.endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:t.model||s.defaultModel,messages:[{role:"user",content:r}],temperature:.2})});if(!l.ok){const u=await l.text().catch(()=>"");throw new Error(`${s.label} request failed: ${l.status}${u?` - ${u.slice(0,180)}`:""}`)}const d=await l.json();return y(d.choices?.[0]?.message?.content??"")}if(t.provider==="gemini"){const s=(t.geminiApiKey||t.apiKey).trim();if(!s)throw new Error("Gemini API key is missing.");const c=t.model||"gemini-2.5-flash-lite",l=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c)}:generateContent?key=${encodeURIComponent(s)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:r}]}],generationConfig:{temperature:.2,responseMimeType:"application/json"}})});if(!l.ok){const p=await l.text().catch(()=>"");throw new Error(`Gemini request failed: ${l.status}${p?` - ${p.slice(0,180)}`:""}`)}const u=(await l.json()).candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("")??"";return y(u)}if(t.provider==="claude"){const s=(t.claudeApiKey||t.apiKey).trim();if(!s)throw new Error("Claude API key is missing.");const c=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":s,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:t.model||"claude-3-5-haiku-latest",max_tokens:1400,temperature:.2,messages:[{role:"user",content:r}]})});if(!c.ok){const u=await c.text().catch(()=>"");throw new Error(`Claude request failed: ${c.status}${u?` - ${u.slice(0,180)}`:""}`)}const d=(await c.json()).content?.map(u=>u.type==="text"?u.text??"":"").join("")??"";return y(d)}let n;try{n=await fetch(t.ollamaUrl||"http://localhost:11434/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:t.model||"qwen2.5-coder:7b",prompt:r,stream:!1,options:{temperature:.2}})})}catch{throw new Error("Could not connect to Ollama. Start Ollama and run: ollama run qwen2.5-coder:7b")}if(!n.ok)throw n.status===403?new Error("Ollama returned 403. Allow Chrome extension origins, restart Ollama, then retry: set OLLAMA_ORIGINS=chrome-extension://*"):new Error(`Ollama request failed: ${n.status}. Make sure the model is installed with: ollama run ${t.model||"qwen2.5-coder:7b"}`);const i=await n.json();return y(i.response??"")}function P(e){return new DOMParser().parseFromString(e,"text/html")}function g(e){return e.replace(/\u00a0/g," ").replace(/\s+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}async function F(e,o){const a=`https://codeforces.com/problemset/problem/${e}/${o}`,t=await fetch(a,{credentials:"include"}).then(p=>{if(!p.ok)throw new Error(`Problem page fetch failed: ${p.status}`);return p.text()}),n=P(t).querySelector(".problem-statement"),i=g(n?.querySelector(".title")?.textContent??`Problem ${e}${o}`),s=g(n?.querySelector(".input-specification")?.textContent??""),c=g(n?.querySelector(".output-specification")?.textContent??""),l=Array.from(n?.querySelectorAll(".sample-tests .input, .sample-tests .output")??[]).map(p=>g(p.textContent??"")),d=g(n?.querySelector(".note")?.textContent??""),u=g(n?.textContent??"");return{title:i,statement:u,inputFormat:s,outputFormat:c,examples:l,notes:d,rawText:u,url:a}}function m(e,o){const a=new Set(e),t=new Set(o),r=new Set([...a,...t]);if(!r.size)return 0;let n=0;return a.forEach(i=>{t.has(i)&&(n+=1)}),n/r.size}function x(e,o){const a=m(e.approachTags,o.approachTags),t=m(e.dataStructures,o.dataStructures),r=m(e.controlFlowShape,o.controlFlowShape),n=m(e.stateVariables,o.stateVariables),i=m(e.edgeCaseSignals,o.edgeCaseSignals),s=e.complexityHint===o.complexityHint?1:0;return a*.32+t*.18+r*.18+n*.12+i*.12+s*.08}function K(e,o){return m(k(e),k(o))}function O(e,o){const a=e.language===o.language?1:0,t=e.loopType===o.loopType?1:0,r=e.namingConvention===o.namingConvention?1:0,n=e.usesRecursion===o.usesRecursion?1:0,i=e.verbosity===o.verbosity?1:0,s=m(e.stlUsage,o.stlUsage),c=Math.abs(e.lineCount-o.lineCount),l=Math.max(0,1-c/Math.max(e.lineCount,o.lineCount,1));return a*.18+t*.15+r*.12+n*.1+i*.12+s*.2+l*.13}function M(e,o){return o.filter(a=>x(e,a.logicFingerprint)>=.08||o.length<=5)}function U(e,o,a,t){return M(o,t).map(n=>{const i=x(o,n.logicFingerprint),s=K(e.code,n.code),c=O(a,n.styleFingerprint),l=i*.6+s*.25+c*.15,d=n.logicFingerprint.approachTags.filter(p=>o.approachTags.includes(p)),u=d.length?`Shares ${d.join(", ")} with the failed code.`:"Kept as a weaker fallback because no close logic tags were detected.";return{...n,totalScore:l,logicalScore:i,tokenScore:s,styleScore:c,reason:u}}).sort((n,i)=>i.totalScore-n.totalScore)}const L="upsol.latestAnalysis";function h(e){const o=e.toLowerCase();return o.includes("c++")||o.includes("gcc")||o.includes("clang")?"cpp":o.includes("python")||o.includes("pypy")?"python":o.includes("java")?"java":o.includes("kotlin")?"kotlin":o.includes("rust")?"rust":o.includes("go")?"go":o.includes("c#")?"csharp":o.split(/\s+/)[0]||"unknown"}async function R(){const o=(await new Promise(a=>{chrome.tabs.query({active:!0,currentWindow:!0},a)}))[0]?.id;if(!o)throw new Error("No active tab found.");return o}async function _(){return await new Promise(e=>{chrome.tabs.query({url:"https://codeforces.com/*/submission/*"},e)})}async function j(e){try{if((await chrome.tabs.sendMessage(e,{type:"PING"}))?.ok)return}catch{await chrome.scripting.executeScript({target:{tabId:e},files:["contentScript.js"]})}}async function f(e,o){return await j(e),chrome.tabs.sendMessage(e,o)}async function D(e){await new Promise((o,a)=>{const t=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(r),a(new Error(`Temporary tab ${e} did not finish loading.`))},2e4),r=(n,i)=>{n===e&&i.status==="complete"&&(clearTimeout(t),chrome.tabs.onUpdated.removeListener(r),o())};chrome.tabs.onUpdated.addListener(r)})}async function b(e,o){const t=(await chrome.tabs.create({url:e,active:!1})).id;if(!t)throw new Error(`Could not open temporary tab for ${e}`);try{return await D(t),await new Promise(r=>setTimeout(r,450)),await f(t,o)}catch(r){const n=r instanceof Error?r.message:"unknown error";throw new Error(`Could not scrape ${e}: ${n}`)}finally{await chrome.tabs.remove(t).catch(()=>{})}}async function S(e){await chrome.storage.local.set({[L]:{...e,updatedAt:Date.now()}})}async function N(e){try{return await F(e.contestId,e.problemIndex)}catch{const o=`https://codeforces.com/problemset/problem/${e.contestId}/${e.problemIndex}`;return b(o,{type:"SCRAPE_PROBLEM_STATEMENT"})}}async function B(e){const o=await W(e);if(o.length)return o;const a=[];for(let n=1;n<=8;n+=1)a.push(`https://codeforces.com/contest/${e.contestId}/status/${e.problemIndex}/page/${n}?order=BY_ARRIVED_DESC`),a.push(`https://codeforces.com/problemset/status/${e.contestId}/problem/${e.problemIndex}/page/${n}?order=BY_ARRIVED_DESC`);const t=[],r=new Set;for(const n of a)try{const i=await b(n,{type:"SCRAPE_ACCEPTED_META",limit:40});for(const s of i)r.has(s.submissionId)||(r.add(s.submissionId),t.push(s));if(t.length>=80)break}catch(i){console.warn(i)}return t}async function W(e){const o=`https://codeforces.com/api/contest.status?contestId=${e.contestId}&from=1&count=200`;try{const a=await fetch(o).then(async n=>{if(!n.ok)throw new Error(`Codeforces API failed: ${n.status}`);return await n.json()});if(a.status!=="OK"||!a.result)return[];const t=new Set,r=[];for(const n of a.result){if(!(String(n.problem?.contestId??e.contestId)===e.contestId&&n.problem?.index?.toUpperCase()===e.problemIndex.toUpperCase())||n.verdict!=="OK")continue;const s=String(n.id);if(!t.has(s)&&(t.add(s),r.push({submissionId:s,userHandle:n.author?.members?.[0]?.handle??n.author?.participantType??"unknown",language:n.programmingLanguage??"Unknown language",sourceUrl:`https://codeforces.com/contest/${e.contestId}/submission/${s}`}),r.length>=80))break}return r}catch(a){return console.warn(a),[]}}async function q(e){const o=await H(e);if(o.length>=1)return o.slice(0,3);const a=await B(e);if(!a.length)throw new Error(`No accepted rows were found on Codeforces status pages for ${e.contestId}${e.problemIndex}.`);const t=h(e.language),r=a.filter(s=>h(s.language)===t);if(t!=="unknown"&&!r.length)throw new Error(`Accepted rows were found, but none matched the failed submission language family (${e.language}).`);const n=(t==="unknown"?a:r).slice(0,60),i=[];for(const s of n)try{const c=await b(s.sourceUrl,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!c.code)continue;if(i.push({...c,userHandle:c.userHandle||s.userHandle,language:c.language==="Unknown language"?s.language:c.language,logicFingerprint:C(c.code),styleFingerprint:$(c.code,c.language==="Unknown language"?s.language:c.language)}),i.length>=3)break}catch(c){console.warn(c)}return i.filter(s=>t==="unknown"||h(s.language)===t)}async function H(e){const o=await _(),a=[],t=h(e.language),r=e.submissionId;for(const n of o)if(!(!n.id||!n.url)&&!(r&&n.url.includes(`/submission/${r}`))&&n.url.includes(`/contest/${e.contestId}/submission/`))try{const i=await f(n.id,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!i.code)continue;const s=i.language==="Unknown language"?e.language:i.language;if(t!=="unknown"&&h(s)!==t)continue;if(a.push({...i,language:s,logicFingerprint:C(i.code),styleFingerprint:$(i.code,s)}),a.length>=3)break}catch(i){console.warn(i)}return a}function G(e){return e?e.replace(/_/g," ").toLowerCase():""}async function J(e){if(!e.viewerHandle)throw new Error("This problem page was detected, but upSol could not find your Codeforces handle. Sign in to Codeforces, then try again from the problem page.");const o=`https://codeforces.com/api/user.status?handle=${encodeURIComponent(e.viewerHandle)}&from=1&count=500`,a=await fetch(o).then(async i=>{if(!i.ok)throw new Error(`Codeforces user status failed: ${i.status}`);return await i.json()});if(a.status!=="OK"||!a.result)throw new Error(a.comment??"Codeforces did not return your recent submissions.");const t=a.result.filter(i=>String(i.problem?.contestId??"")===e.contestId&&i.problem?.index?.toUpperCase()===e.problemIndex.toUpperCase()&&G(i.verdict).includes("wrong answer")).sort((i,s)=>(s.creationTimeSeconds??0)-(i.creationTimeSeconds??0))[0];if(!t)throw new Error(`No recent Wrong Answer submission was found for ${e.contestId}${e.problemIndex} under ${e.viewerHandle}.`);const r=`https://codeforces.com/contest/${e.contestId}/submission/${t.id}`,n=await b(r,{type:"SCRAPE_SUBMISSION_SOURCE"});if(!n.code)throw new Error(`Found submission ${t.id}, but Codeforces did not expose its source code in this session.`);return{url:r,contestId:e.contestId,problemIndex:e.problemIndex,submissionId:String(t.id),verdict:t.verdict?t.verdict.replace(/_/g," "):"Wrong answer",language:t.programmingLanguage??n.language??"Unknown language",code:n.code}}function V(e){return e.provider==="none"?!1:e.provider==="gemini"?!!(e.geminiApiKey||e.apiKey).trim():e.provider==="openai"?!!(e.openaiApiKey||e.apiKey).trim():e.provider==="claude"?!!(e.claudeApiKey||e.apiKey).trim():e.provider==="deepseek"?!!(e.deepseekApiKey||e.apiKey).trim():e.provider==="kimi"?!!(e.kimiApiKey||e.apiKey).trim():e.provider==="ollama"?!!e.ollamaUrl:!1}async function Y(e){await S({status:"running"});const o=await R(),a=await f(o,{type:"DETECT_ANALYZABLE_PAGE"});if(!a.ok)throw new Error(a.reason);const t=a.pageType==="problem"?await f(o,{type:"SCRAPE_PROBLEM_PAGE_CONTEXT"}):null,r=a.pageType==="problem"&&t?await J(t):await f(o,{type:"SCRAPE_FAILED_CODE"});if(!r.code)throw new Error("Failed source code was not found on the page.");if(!r.contestId||!r.problemIndex)throw new Error("Could not detect contest ID or problem index from this submission.");const n=t?.problemStatement?.rawText||t?.problemStatement?.statement?t.problemStatement:await N(r);let i=[];try{i=await q(r)}catch(w){const E=w instanceof Error?w.message:"Unknown accepted-submission collector error.";throw new Error(`Step 4 failed: ${E}`)}if(!i.length)throw new Error("No accepted source code could be collected. Codeforces blocked or hid the accepted submission source pages in this browser session.");const s=C(r.code),c=$(r.code,r.language),l=U(r,s,c,i).slice(0,3),d=V(e);let u=null,p=!d;if(d)try{u=await T(r,n,l,e)}catch(w){console.warn(w),p=!0}const A={failedSubmission:r,problemStatement:n,acceptedSubmissions:i,matchedSubmissions:l,explanation:u,explanationSkipped:p};return await S({status:"complete",result:A}),A}chrome.runtime.onMessage.addListener((e,o,a)=>{const t=e;if(t.type==="ANALYZE_CURRENT_TAB")return Y(t.settings).then(r=>a({ok:!0,result:r})).catch(async r=>{const n=r instanceof Error?r.message:"Unknown analysis error.";await S({status:"error",error:n}),a({ok:!1,error:n})}),!0});
