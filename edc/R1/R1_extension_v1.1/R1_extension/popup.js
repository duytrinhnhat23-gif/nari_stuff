const box=document.getElementById("data"), status=document.getElementById("status");
function clean(s){s=s.trim();s=s.replace(/^\s*(?:const|let|var)\s+data\s*=\s*/,"");s=s.replace(/;\s*$/,"");return s;}
chrome.storage.local.get(["r1Data"],r=>{if(r.r1Data)box.value=JSON.stringify(r.r1Data,null,2);});
document.getElementById("save").addEventListener("click",async()=>{try{const obj=JSON.parse(clean(box.value));if(!obj||Array.isArray(obj)||typeof obj!=="object")throw new Error("Top-level value must be an object");await chrome.storage.local.set({r1Data:obj});box.value=JSON.stringify(obj,null,2);status.textContent="Saved. Go to the form and press F5.";}catch(e){status.textContent="Not valid JSON-compatible object: "+e.message;}});
