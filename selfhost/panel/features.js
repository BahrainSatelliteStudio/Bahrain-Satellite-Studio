"use strict";
const KEYS = ['servers','contact','notify','activation','backup','brand','themes'];
function validateManifest(m) {
 if (!m || m.version !== 1 || typeof m.name !== 'string' || typeof m.slug !== 'string' || !Array.isArray(m.features) || m.features.some(k=>!KEYS.includes(k))) throw new Error('ملف ميزات لوحة الزبون غير صالح');
 return m;
}
function featureEnabled(m,key){return !m || m.features.includes(key);}
function settingsAllowed(m,patch){
 if(!m)return true;
 const safe=new Set(['_section','_summary']);
 if(featureEnabled(m,'contact'))['whatsapp','telegram','facebook','website','email','phone','store_url','notice'].forEach(k=>safe.add(k));
 return Object.keys(patch).every(k=>safe.has(k));
}
function restoreAllowed(m,current,next){
 if(!m)return true;
 if(!next.settings||JSON.stringify(next.settings)!==JSON.stringify(current.settings))return false;
 if(!featureEnabled(m,'servers')&&JSON.stringify(next.servers)!==JSON.stringify(current.servers))return false;
 if(!featureEnabled(m,'notify')&&JSON.stringify(next.notifications||[])!==JSON.stringify(current.notifications))return false;
 return true;
}
module.exports={validateManifest,featureEnabled,settingsAllowed,restoreAllowed};
