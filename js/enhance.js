// === Feature Pack (v2): reply + pin + forward + reactions, fix chồng lấn ===
(function(){
  const $ = id => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const esc = s => (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const token = localStorage.getItem('token')||'';
  const headers = { Authorization:`Bearer ${token}` };
  const meName = localStorage.getItem('username')||'Tôi';

  const FP = { mode:null, otherId:null, gid:null, members:[], selecting:false, selected:new Set() };

  // ----- PIN local -----
  const roomKey = ()=> FP.mode==='dm'?`dm:${FP.otherId||''}` : FP.mode==='group'?`gp:${FP.gid||''}` : '';
  const readPins = ()=>{ try{return JSON.parse(localStorage.getItem(`pinned:${roomKey()}`)||'[]');}catch{return[];} };
  const writePins = a => localStorage.setItem(`pinned:${roomKey()}`, JSON.stringify(a));
  const isPinned = id => readPins().some(x=>x.id===id);
  function togglePinLite(meta){ const arr=readPins(); const i=arr.findIndex(x=>x.id===meta.id); if(i>=0) arr.splice(i,1); else arr.unshift(meta); writePins(arr); paintPinned(); }
  function paintPinned(){
    const ul = $('pinnedList'); if(!ul) return;
    const arr=readPins(); ul.innerHTML='';
    if(!arr.length){ const li=document.createElement('li'); li.className='last-seen'; li.textContent='Chưa có tin ghim.'; ul.appendChild(li); return; }
    arr.forEach(p=>{
      const li=document.createElement('li');
      li.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1"><b>${esc(p.sender||'')}</b> · <span class="last-seen">${new Date(p.createdAt).toLocaleTimeString()}</span><br>${esc((p.text||'').slice(0,140))}</div>
        <button class="btn btn-sm" data-act="jump">Nhảy tới</button>
        <button class="btn btn-sm" data-act="unpin">Bỏ ghim</button>
      </div>`;
      li.onclick = e=>{
        const act=e.target?.dataset?.act;
        if(act==='jump'){ const el=document.querySelector(`.msg[data-id="${CSS.escape(p.id)}"]`); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('highlight'); setTimeout(()=>el.classList.remove('highlight'),800); } }
        if(act==='unpin'){ togglePinLite({id:p.id}); }
      };
      ul.appendChild(li);
    });
  }
  on($('btnPinnedToggle'),'click',()=>{ const p=$('pinnedPanel'); if(!p) return; p.style.display=p.style.display==='none'?'block':'none'; if(p.style.display==='block') paintPinned(); });

  // ----- Reply -----
  let replyCtx=null;
  function startReply(meta){
    replyCtx=meta;
    const bar=$('replyBar'),info=$('replyInfo'); if(bar&&info){ info.innerHTML=`<b>Đang trả lời ${esc(meta.sender)}</b>: ${esc((meta.preview||'').slice(0,120))}`; bar.style.display='flex'; }
  }
  function cancelReply(){ replyCtx=null; $('replyBar').style.display='none'; $('replyInfo').textContent=''; }
  on($('replyCancel'),'click',cancelReply);
  function replyPrefix(c){ return c?`[[reply|${c.id}|${c.sender}|${new Date(c.createdAt||Date.now()).toISOString()}]] ${(c.preview||'').replace(/\n/g,' ').slice(0,140)}\n\n`:''; }
  const origSend = $('btnSend').onclick;
  $('btnSend').onclick = function(e){
    const ta=$('msgInput');
    if(replyCtx && ta && ta.value.trim()){ ta.value = replyPrefix(replyCtx) + ta.value; cancelReply(); }
    return origSend?.call(this,e);
  };

  // ----- Emoji -----
  const EMOJIS=['😀','😁','😂','🤣','😊','😍','😘','🤔','👍','👏','🙏','💯','🔥','🎉','😎','😢','😡','🙈','💡','⭐'];
  function buildEmoji(){ const p=$('emojiPanel'); if(!p) return; p.innerHTML=''; EMOJIS.forEach(e=>{ const b=document.createElement('button'); b.className='emoji'; b.textContent=e; b.style.fontSize='20px'; b.style.padding='6px'; b.onclick=()=>{ const ta=$('msgInput'); const s=ta.selectionStart||ta.value.length; const epos=ta.selectionEnd||ta.value.length; ta.value=ta.value.slice(0,s)+e+ta.value.slice(epos); ta.setSelectionRange(s+e.length,s+e.length); p.style.display='none'; }; p.appendChild(b); }); }
  buildEmoji();
  on($('emojiBtn'),'click',()=>{ const p=$('emojiPanel'); p.style.display=p.style.display==='block'?'none':'block'; });
  document.addEventListener('click',e=>{ const p=$('emojiPanel'); if(!p) return; if(!p.contains(e.target)&&e.target!==$('emojiBtn')) p.style.display='none'; });

  // ----- Select nhiều / Bulk -----
  function updateBulk(){ $('bulkCount').textContent=`${FP.selected.size} đã chọn`; $('bulkBar').style.display = FP.selecting || FP.selected.size ? 'flex' : 'none'; }
  on($('btnMulti'),'click',()=>{ FP.selecting=!FP.selecting; $('messages').classList.toggle('selecting',FP.selecting); updateBulk(); });
  on($('bulkPin'),'click',()=>{ [...FP.selected].forEach(id=>togglePinLite({id})); alert('Đã ghim các tin đã chọn'); });
  on($('bulkCopy'),'click',()=>{ const t=[...FP.selected].map(id=>document.querySelector(`.msg[data-id="${CSS.escape(id)}"] .msg-text`)?.innerText||''); navigator.clipboard?.writeText(t.join('\n')); alert('Đã copy'); });
  on($('bulkForward'),'click',()=>{ const t=[...FP.selected].map(id=>document.querySelector(`.msg[data-id="${CSS.escape(id)}"] .msg-text`)?.innerText||''); const ta=$('msgInput'); ta.value = (ta.value?ta.value+'\n':'') + 'FW:\n' + t.join('\n'); ta.focus(); });
  on($('bulkHide'),'click',()=>{ [...FP.selected].forEach(id=>document.querySelector(`.msg[data-id="${CSS.escape(id)}"]`)?.remove()); FP.selected.clear(); updateBulk(); });

  // ----- Reactions local -----
  const reactKey = ()=>`react:${roomKey()}`;
  const readReact = ()=>{ try{return JSON.parse(localStorage.getItem(reactKey())||'{}');}catch{return{};} };
  const writeReact = o => localStorage.setItem(reactKey(), JSON.stringify(o||{}));
  function toggleReact(mid, emoji){
    const all=readReact(); const row=all[mid]||{}; row[emoji]=row[emoji]?0:1; all[mid]=row; writeReact(all);
    const pill=document.querySelector(`.msg[data-id="${CSS.escape(mid)}"] .react-pill[data-emoji="${emoji}"]`);
    if(pill){ const on=!!row[emoji]; pill.classList.toggle('active',on); pill.textContent=`${emoji} ${on?1:0}`; }
  }

  // ----- Tăng tiện ích cho mỗi message sau khi render -----
  function ensureActions(el){
    let act = el.querySelector('.msg-actions');
    if(!act){ act=document.createElement('div'); act.className='msg-actions'; el.appendChild(act); }
    const has = sel => !!act.querySelector(sel);

    if(!has('[data-fp="reply"]')){
      const b=document.createElement('button'); b.className='msg-btn'; b.dataset.fp='reply'; b.textContent='↩ Trả lời';
      b.onclick = e=>{ e.stopPropagation(); const sender = el.classList.contains('me') ? (meName||'Tôi') : (el.querySelector('.msg-meta')?.textContent?.split('·')[0]?.trim() || 'Thành viên'); const preview = el.querySelector('.msg-text')?.innerText || ''; startReply({id:el.dataset.id, sender, preview, createdAt: Date.now()}); };
      act.appendChild(b);
    }
    if(!has('[data-fp="forward"]')){
      const b=document.createElement('button'); b.className='msg-btn'; b.dataset.fp='forward'; b.textContent='↪ Chuyển';
      b.onclick = e=>{ e.stopPropagation(); const txt=el.querySelector('.msg-text')?.innerText || ''; const ta=$('msgInput'); ta.value = (ta.value?ta.value+'\n':'') + 'FW: ' + txt; ta.focus(); };
      act.appendChild(b);
    }
    if(!has('[data-fp="pin-toggle"]')){
      const b=document.createElement('button'); b.className='msg-btn'; b.dataset.fp='pin-toggle';
      const setTxt=()=> b.textContent = isPinned(el.dataset.id)?'⭐ Bỏ ghim':'☆ Ghim';
      setTxt();
      b.onclick = e=>{ e.stopPropagation(); const txt=el.querySelector('.msg-text')?.innerText || ''; const sender= el.classList.contains('me')?(meName||'Tôi'):(el.querySelector('.msg-meta')?.textContent?.split('·')[0]?.trim()||''); togglePinLite({id:el.dataset.id,text:txt,createdAt:Date.now(),sender}); setTxt(); };
      act.appendChild(b);
    }
    if(!has('[data-fp="copy"]')){
      const b=document.createElement('button'); b.className='msg-btn'; b.dataset.fp='copy'; b.textContent='📋 Copy';
      b.onclick = e=>{ e.stopPropagation(); const txt=el.querySelector('.msg-text')?.innerText || ''; navigator.clipboard?.writeText(txt); };
      act.appendChild(b);
    }
    if(!has('[data-fp="hide"]')){
      const b=document.createElement('button'); b.className='msg-btn'; b.dataset.fp='hide'; b.textContent='Ẩn';
      b.onclick = e=>{ e.stopPropagation(); el.remove(); };
      act.appendChild(b);
    }
  }

  function ensureReactions(el){
    if(el.querySelector('.react-bar')) return;
    const bar=document.createElement('div'); bar.className='react-bar';
    ['👍','❤️','😂'].forEach(em=>{
      const pill=document.createElement('button'); pill.className='react-pill'; pill.dataset.emoji=em; pill.textContent=`${em} 0`;
      pill.onclick = e=>{ e.stopPropagation(); toggleReact(el.dataset.id, em); };
      bar.appendChild(pill);
    });
    el.appendChild(bar);
    const all=readReact(); const row=all[el.dataset.id]||{};
    [...bar.querySelectorAll('.react-pill')].forEach(p=>{ const on=row[p.dataset.emoji]?true:false; p.classList.toggle('active',on); p.textContent=`${p.dataset.emoji} ${on?1:0}`; });
  }

  function ensureSelectBox(el){
    if(!FP.selecting) return;
    let cb=el.querySelector('input.sel-box');
    if(!cb){ cb=document.createElement('input'); cb.type='checkbox'; cb.className='sel-box'; el.prepend(cb); }
    cb.onchange = ()=>{ if(cb.checked) FP.selected.add(el.dataset.id); else FP.selected.delete(el.dataset.id); updateBulk(); };
  }

  const OBS = new MutationObserver(muts=>{
    muts.forEach(m=>{
      [...m.addedNodes].forEach(node=>{
        if(!(node instanceof HTMLElement)) return;
        if(node.classList.contains('msg')){
          ensureActions(node);
          ensureReactions(node);
          ensureSelectBox(node);
        }
      });
    });
  });
  OBS.observe($('messages'), { childList:true, subtree:false });

  function afterOpen(){
    FP.selected.clear(); FP.selecting=false; updateBulk(); paintPinned();
    document.querySelectorAll('#messages .msg').forEach(el=>{ ensureActions(el); ensureReactions(el); });
  }

  const enterCb = $('enterSend');
  on($('msgInput'),'keydown',e=>{
    if(enterCb?.checked && e.key==='Enter' && !e.shiftKey){ e.preventDefault(); $('btnSend').click(); }
  });
  on($('btnScrollBottom'),'click',()=>{ const box=$('messages'); box.scrollTop=box.scrollHeight; });

  const origOpenDM = window.openDM, origOpenGroup = window.openGroup;
  window.openDM = async function(otherId, name){
    FP.mode='dm'; FP.otherId=String(otherId); FP.gid=null; FP.members=[];
    const r = await origOpenDM.apply(this, arguments);
    afterOpen(); return r;
  };
  window.openGroup = async function(gid, name){
    FP.mode='group'; FP.gid=String(gid); FP.otherId=null; FP.members=[];
    try{ const res=await fetch(`/api/groups/${gid}/members`,{headers}); const data=await res.json().catch(()=>({})); FP.members=data.members||[]; }catch{}
    const r = await origOpenGroup.apply(this, arguments);
    afterOpen(); return r;
  };

  afterOpen();
})();
