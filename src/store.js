/* Browser-only storage adapter. A completed IDB transaction is not an external backup. */
(function () {
  'use strict';
  class BrowserStore {
    constructor() {this.db = null; this.available = false; this.error = '';}
    async open() {
      try {
        this.db = await new Promise((resolve,reject) => {
          const r = indexedDB.open('luce-retrobooth-prototype-v05', 1);
          r.onupgradeneeded = () => {
            r.result.createObjectStore('clips', {keyPath:'id'});
            r.result.createObjectStore('settings', {keyPath:'key'});
          };
          r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
          r.onblocked = () => reject(new Error('Storage upgrade blocked by another tab.'));
        });
        this.db.onversionchange = () => {this.db.close(); this.available = false;};
        this.available = true;
      } catch (e) {this.error = String(e?.message || e);}
      return this.available;
    }
    async request(storeName, mode, fn) {
      if (!this.db || !this.available) throw new Error('Browser storage unavailable.');
      return new Promise((resolve,reject) => {
        let result;
        const tx = this.db.transaction(storeName, mode);
        const r = fn(tx.objectStore(storeName));
        if (r) r.onsuccess = () => {result = r.result;};
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || r?.error || new Error('Storage operation failed.'));
        tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
      });
    }
    saveClip(clip) {
      if(!this.db || !this.available) return Promise.reject(new Error('Browser storage unavailable.'));
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction(['clips','settings'],'readwrite');
        const cs=tx.objectStore('clips'), existing=cs.get(clip.id);
        existing.onsuccess=()=>{
          if(existing.result?.lifecycle==='deleted'){tx.abort();return;}
          // saveClip is for capture insert/retry, not permission mutation.
          if(existing.result){if(existing.result.createdAt!==clip.createdAt||existing.result.sha256!==clip.sha256)tx.abort();return;}
          cs.put(clip);
        };
        const config=tx.objectStore('settings'),r=config.get('sequence');
        r.onsuccess=()=>config.put({key:'sequence',next:Math.max(r.result?.next||1,clip.seq+1)});
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Local commit failed.'));
        tx.onabort=()=>reject(tx.error||new Error('Local commit aborted.'));
      });
    }
    getClip(id) {return this.request('clips','readonly',s=>s.get(id));}
    mutateClip(id, update) {
      if(!this.available) return Promise.reject(new Error('Browser storage unavailable.'));
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction('clips','readwrite'), cs=tx.objectStore('clips');
        let result, failure;const req=cs.get(id);
        req.onsuccess=()=>{
          try {
            if(!req.result)throw new Error('Clip no longer exists.');
            if(req.result.lifecycle==='deleted'){result=req.result;return;}
            result=update(req.result);cs.put(result);
          } catch(e){failure=e;tx.abort();}
        };
        tx.oncomplete=()=>resolve(result);
        tx.onerror=tx.onabort=()=>reject(failure||tx.error||new Error('Clip update failed.'));
      });
    }
    getSequence() {return this.request('settings','readonly',s=>s.get('sequence'));}
    list() {return this.request('clips','readonly', s => s.getAll());}
    remove(id) {return this.request('clips','readwrite', s => s.delete(id));}
    async getAux(key) {return (await this.request('settings','readonly',s=>s.get(key)))?.value;}
    setAux(key,value) {return this.request('settings','readwrite',s=>s.put({key,value}));}
    cloudPoolChange(fn) {
      if(!this.available)return Promise.reject(new Error('Persistent browser storage is required for cloud QR links.'));
      return new Promise((resolve,reject)=>{let value,failure;
        const tx=this.db.transaction('settings','readwrite'),cs=tx.objectStore('settings'),r=cs.get('cloud-pool');
        r.onsuccess=()=>{try{const result=fn(r.result?.value);value=result.value;cs.put({key:'cloud-pool',value:result.pool});}catch(e){failure=e;tx.abort();}};
        tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(failure||tx.error||new Error('Cloud slot commit failed.'));
      });
    }
    appendCloudSlots(binding,slots) {return this.cloudPoolChange(old=>{if(old&&old.binding!==binding)throw new Error('Cloud pool binding changed.');return {pool:{binding,slots:[...(old?.slots||[]),...slots]},value:true};});}
    takeCloudSlot(binding,localId) {
      if(!this.available)return Promise.reject(new Error('Persistent QR storage unavailable.'));
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction('settings','readwrite'),cs=tx.objectStore('settings');let pool,used,loads=0,slot=null,failure;
        const apply=()=>{if(++loads!==2)return;try{
          if(!pool||pool.binding!==binding)return;
          const slots=pool.slots.filter(x=>x.expiresAt*1000>Date.now()),prefix=binding.split('|')[0]+'|';
          while(slots.length){const next=slots.shift();if(!used[prefix+next.id]){slot={...next,localId};used[prefix+next.id]=localId;break;}}
          cs.put({key:'cloud-pool',value:{binding,slots}});cs.put({key:'cloud-used',value:used});
        }catch(e){failure=e;tx.abort();}};
        const a=cs.get('cloud-pool'),b=cs.get('cloud-used');a.onsuccess=()=>{pool=a.result?.value;apply();};b.onsuccess=()=>{used=b.result?.value||{};apply();};
        tx.oncomplete=()=>resolve(slot);tx.onerror=tx.onabort=()=>reject(failure||tx.error||new Error('QR claim failed; do not reuse the link.'));
      });
    }
    ackCloudDeletion(id) {
      return this.request('clips','readwrite',s=>{const r=s.get(id);r.onsuccess=()=>{const c=r.result;if(c?.lifecycle==='deleted'&&c.cloud?.ackPending)s.put({id:c.id,seq:c.seq,createdAt:c.createdAt,lifecycle:'deleted',deletedAt:c.deletedAt,cloudDeleted:true});};});
    }
    getSettings() {return this.request('settings','readonly', s => s.get('event'));}
    setSettings(value) {return this.request('settings','readwrite', s => s.put({key:'event',value}));}
  }
  window.BrowserStore = BrowserStore;
})();
