/* Chat UI – nâng cấp: typing, mention, edit/delete, reaction đếm, draft per room, giữ fix trùng ngày */
(function () {
  // ===== Helpers =====
  const q = id => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const esc = (s = "") => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isImg = u => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u);
  const fmtT = d => new Date(d).toLocaleTimeString();
  const fmtD = d => new Date(d).toLocaleDateString("vi-VN");
  const asArr = v => Array.isArray(v) ? v : (v && Array.isArray(v.messages) ? v.messages : (Array.isArray(v?.data) ? v.data : []));

  // inject CSS nhỏ cho tính năng mới (nếu thiếu)
  (function injectCSS(){
    const css = `
      #typingPill{position:fixed;left:16px;bottom:92px;background:#111827;color:#fff;padding:6px 10px;border-radius:16px;font-size:12px;opacity:.9;display:none;z-index:9990}
      #mentionBox{position:fixed;max-height:220px;overflow:auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);display:none;z-index:9991}
      #mentionBox .itm{padding:8px 10px;cursor:pointer;display:flex;gap:8px;align-items:center}
      #mentionBox .itm:hover{background:#f3f4f6}
      .msg-actions{display:flex;gap:6px;margin-top:4px;opacity:.88}
      .react-bar{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
      .react-pill{display:inline-flex;gap:4px;align-items:center;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:12px;cursor:pointer;user-select:none}
      .react-pill.active{background:#eef2ff;border-color:#c7d2fe}
      .msg .edited-flag{font-size:11px;color:#6b7280;margin-left:6px}
      .msg-edit-box{margin-top:6px;display:flex;gap:6px}
      .msg-edit-input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:6px 8px}
      .btn-xxs{padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer}
      .btn-xxs:hover{background:#f9fafb}
    `;
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  })();

  function showBanner(msg, err) {
    const b = q("appBanner"), t = q("bannerText");
    if (!b || !t) return;
    t.textContent = msg;
    b.classList.toggle("error", !!err);
    b.style.display = "block";
  }
  function hideBanner() { const b = q("appBanner"); if (b) b.style.display = "none"; }
  function debug(msg){ if (window.__NO_DEBUG) return; console.log("[chat]", msg); }

  // ===== Auth & Prefs =====
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("username") || localStorage.getItem("email") || "Tôi";
  if (!token || !userId) { showBanner("Chưa đăng nhập. Trả về đăng nhập…", true); setTimeout(()=>location.href="/index.html",500); return; }
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Theme toggle (nếu có nút)
  on(q("btnTheme"), "click", () => { document.body.classList.toggle("dark"); localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light"); });
  if ((localStorage.getItem("theme")||"") === "dark") document.body.classList.add("dark");

  // ===== Safe fetch =====
  async function safeFetch(url, opt) {
    const r = await fetch(url, opt);
    const txt = await r.text();
    let data={}; try{ data = txt ? JSON.parse(txt) : {} }catch{ data = {} }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }
  async function apiGet(url){ try{ return await safeFetch(url,{headers}); }catch(e){ if(/401/.test(e.message)){ localStorage.clear(); location.href="/index.html"; } throw e; } }
  async function apiPost(url, body){ try{ return await safeFetch(url,{method:"POST", headers:jsonHeaders, body:JSON.stringify(body||{})}); }catch(e){ if(/401/.test(e.message)){ localStorage.clear(); location.href="/index.html"; } throw e; } }
  async function apiPatch(url, body){ return safeFetch(url,{method:"PATCH", headers:jsonHeaders, body:JSON.stringify(body||{})}); }
  async function apiDelete(url){ return safeFetch(url,{method:"DELETE", headers}); }

  // ===== Compat layer =====
  function normMsg(m, ctx) {
    const n = { ...m };
    n._id = n._id || n.id || `${(n.conversationId || n.group || n.roomId || n.receiver || "x")}:${n.sender || n.senderId}:${n.createdAt || n.timestamp}`;
    n.senderId = n.senderId || n.sender || n.from || n.author || n.user;
    n.receiver = n.receiver || n.to || ctx?.otherId || null;
    n.conversationId = n.conversationId || n.group || n.roomId || ctx?.conversationId || null;
    n.text = (n.text != null) ? n.text : (n.body || n.content || "");
    n.createdAt = n.createdAt || n.timestamp || n.created_at || Date.now();
    n.attachments = n.attachments || n.files || [];
    n.senderName = n.senderName || n.username || n.name;
    n.reactions = n.reactions || {}; // { "👍": ["userId1", ...], ...}
    n.editedAt = n.editedAt || null;
    n.deleted = n.deleted || false;
    return n;
  }

  async function tryMany(endpoints) { for (const url of endpoints) { try { const d = await apiGet(url); return asArr(d);} catch{} } return []; }
  async function fetchFriends(){ return tryMany(["/api/friends","/api/users/friends","/api/friends/list"]); }
  async function fetchGroups(){ return tryMany(["/api/groups","/api/chat/groups","/api/conversations"]); }

  async function fetchDM(otherId, { before=null, limit=50 }={}) {
    const qs = []; if (before) qs.push(`before=${encodeURIComponent(before)}`); if (limit) qs.push(`limit=${limit}`);
    const s = qs.length ? `?${qs.join("&")}` : "";
    const eps = [`/api/dm/history/${otherId}${s}`, `/api/messages/dm/${otherId}${s}`, `/api/messages?type=dm&userId=${encodeURIComponent(otherId)}${s? "&"+s.slice(1):""}`];
    return (await tryMany(eps)).map(x => normMsg(x, { otherId }));
  }
  async function fetchGroupMsgs(gid, { before=null, limit=50 }={}) {
    const qs = []; if (before) qs.push(`before=${encodeURIComponent(before)}`); if (limit) qs.push(`limit=${limit}`);
    const s = qs.length ? `?${qs.join("&")}` : "";
    const eps = [`/api/messages/${gid}${s}`, `/api/messages/group/${gid}${s}`, `/api/messages?type=group&group=${encodeURIComponent(gid)}${s? "&"+s.slice(1):""}`];
    return (await tryMany(eps)).map(x => normMsg(x, { conversationId: gid }));
  }
  async function sendDM(otherId, payload) {
    const c = [() => apiPost("/api/dm/send", payload), () => apiPost("/api/messages/send-dm", payload), () => apiPost("/api/messages", { ...payload, type:"dm" })];
    for (const fn of c){ try{ const r = await fn(); return normMsg(r, { otherId }); }catch{} } throw new Error("Không gửi được DM");
  }
  async function sendGroup(gid, payload) {
    const c = [() => apiPost("/api/messages", { ...payload, conversationId: gid }), () => apiPost(`/api/messages/${gid}`, payload), () => apiPost("/api/messages/send", { ...payload, conversationId: gid })];
    for (const fn of c){ try{ const r = await fn(); return normMsg(r, { conversationId: gid }); }catch{} } throw new Error("Không gửi được nhóm");
  }
  async function patchMessage(mid, body){
    const c = [() => apiPatch(`/api/messages/${mid}`, body), () => apiPost("/api/messages/edit", { id: mid, ...body })];
    for (const fn of c){ try{ return await fn(); }catch{} } throw new Error("Sửa tin nhắn thất bại");
  }
  async function deleteMessage(mid){
    const c = [() => apiDelete(`/api/messages/${mid}`), () => apiPost("/api/messages/delete", { id: mid })];
    for (const fn of c){ try{ return await fn(); }catch{} } throw new Error("Xoá tin nhắn thất bại");
  }
  async function reactMessage(mid, emoji, on){
    const c = [() => apiPost("/api/messages/react", { id: mid, emoji, on }), () => apiPatch(`/api/messages/${mid}/react`, { emoji, on })];
    for (const fn of c){ try{ return await fn(); }catch{} } // không throw: cho phép local-only
    return null;
  }

  // ===== State =====
  const state = { mode:null, otherId:null, conversationId:null, oldestTs:null, friends:[], groups:[] };
  const seen = new Set();
  const unread = {};
  const clientReactions = new Map(); // msgId -> { emoji -> Set(userId) }
  const msgIndex = new Map();       // msgId -> DOM node
  let mentionBox = null;
  let typingPill = null;
  let msgInput = null;

  // ===== UI Bootstrap =====
  function ensurePill(){
    if (!typingPill){
      typingPill = document.createElement("div");
      typingPill.id = "typingPill";
      document.body.appendChild(typingPill);
    }
  }
  function ensureMentionBox(){
    if (!mentionBox){
      mentionBox = document.createElement("div");
      mentionBox.id = "mentionBox";
      document.body.appendChild(mentionBox);
    }
  }
  ensurePill(); ensureMentionBox();

  function roomKey(){
    if (state.mode === "dm" && state.otherId) return `dm:${state.otherId}`;
    if (state.mode === "group" && state.conversationId) return `group:${state.conversationId}`;
    return null;
    }

  // ===== Render Lists =====
  function renderFriends(list){
    state.friends = list||[];
    const root = q("friends"), cbRoot = q("friendCheckboxList");
    if (root) root.innerHTML = "";
    if (cbRoot) cbRoot.innerHTML = "";
    state.friends.forEach(f=>{
      const name = f.username || f.name || f._id || f.id;
      if (root){
        const item = document.createElement("div");
        item.className = "friend-item";
        item.dataset.id = f._id || f.id;
        item.innerHTML = `
          <div class="row" style="gap:6px;align-items:center">
            <span class="status-dot ${f.online ? "online":"offline"}"></span>
            <img class="avatar" src="${esc(f.avatarUrl||"/img/avatar-default.png")}" alt="">
            <span>${esc(name||"")}</span>
          </div>
          <div class="friend-right">
            <div class="last-seen">${f.online ? "Đang hoạt động":"Ngoại tuyến"}</div>
            <button class="btn btn-sm">Chat riêng</button>
          </div>`;
        const btns = item.querySelectorAll(".friend-right button");
if(btns[0]) btns[0].onclick = () => openDM(f._id||f.id, name);
const btnRemove = item.querySelector(".btn-remove");
if(btnRemove) btnRemove.onclick = () => removeFriend(f._id||f.id);

        root.appendChild(item);
      }
      async function removeFriend(uid){
  if(!confirm("Bạn chắc muốn xoá bạn này?")) return;
  try{
    await apiPost("/api/friends/remove",{ userId: uid });
    showBanner("Đã xoá bạn");
    await bootstrapLists();
  }catch(e){ showBanner("Không thể xoá bạn: "+e.message,true); }
}

      if (cbRoot){
        const wrap = document.createElement("label");
        wrap.className = "cb-item";
        wrap.innerHTML = `<input type="checkbox" value="${esc(f._id||f.id)}"><span class="status-dot ${f.online?"online":"offline"}"></span><span>${esc(name||"")}</span>`;
        cbRoot.appendChild(wrap);
      }
    });
  }
  function renderGroups(list){
    state.groups = list||[];
    const root = q("groups");
    if (!root) return;
    root.innerHTML = "";
    state.groups.forEach(g=>{
      const id = g._id||g.id||g.groupId;
      const name = g.name||g.title||id;
      const li = document.createElement("li");
      li.className="group-item";
      li.dataset.id=id;
      li.innerHTML = `
        <span>${esc(name)}</span>
        <span class="last-seen">(${esc(id)})</span>
        <span class="badge" id="badge-${esc(id)}" style="display:${unread[id]?'inline-block':'none'}">${unread[id]||0}</span>
        <button class="btn btn-sm">Mở</button>`;
      li.querySelector("button").onclick = () => openGroup(id, name);
      root.appendChild(li);
    });
  }

  // ===== Message rendering with date separator (no-duplicate) =====
  const getTopDate = () => { const s = document.querySelector('#messages .date-sep'); return s ? s.textContent.trim() : null; };
  const getBottomDate = () => { const seps = document.querySelectorAll('#messages .date-sep'); return seps.length ? seps[seps.length-1].textContent.trim() : null; };

  function renderMessages(msgs, { appendTop=false, replace=false } = {}) {
    const box = q("messages"); if (!box) return;
    if (replace){ box.innerHTML=""; seen.clear(); state.oldestTs=null; msgIndex.clear(); }

    const arr = (Array.isArray(msgs)?msgs:[]).slice()
      .map(m => normMsg(m, { conversationId: state.conversationId, otherId: state.otherId }))
      .filter(m => !seen.has(m._id))
      .sort((a,b) => +new Date(a.createdAt||0) - +new Date(b.createdAt||0));

    let prevDate = replace ? null : (appendTop ? getTopDate() : getBottomDate());
    const frag = document.createDocumentFragment();

    for (const m of arr){
      seen.add(m._id);
      const dt = new Date(m.createdAt||Date.now());
      const dLabel = fmtD(dt);

      if (dLabel !== prevDate){
        const sep = document.createElement("div");
        sep.className = "date-sep";
        sep.textContent = dLabel;
        frag.appendChild(sep);
        prevDate = dLabel;
      }

      state.oldestTs = state.oldestTs ? Math.min(state.oldestTs, +dt) : +dt;

      const mine = String(m.senderId) === String(userId);
      const wrap = document.createElement("div");
      wrap.className = "msg " + (mine ? "me":"other");
      wrap.dataset.id = m._id;

      const b = document.createElement("div");
      b.className = "msg-bubble";

      const meta = document.createElement("div");
      meta.className = "msg-meta";
      meta.textContent = `${mine ? "Tôi" : (m.senderName || m.senderId)} · ${fmtT(dt)}`;
      if (m.editedAt) {
        const ef = document.createElement("span");
        ef.className = "edited-flag";
        ef.textContent = "(đã chỉnh sửa)";
        meta.appendChild(ef);
      }
      b.appendChild(meta);

      const body = document.createElement("div");
      body.className = "msg-text";
      const text = m.deleted ? "<i>Tin nhắn đã bị xoá</i>" : esc(m.text||"");
      body.innerHTML = text.replace(/https?:\/\/[^\s]+/g, u => isImg(u)
        ? `<br><img src="${esc(u)}" style="max-width:260px;border:1px solid #eee;border-radius:8px;margin-top:4px">`
        : `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`);
      b.appendChild(body);

      // Attachments
      (m.attachments||[]).forEach(att=>{
        if (!att || !att.url) return;
        const img = document.createElement("img");
        img.src = att.url;
        img.style.maxWidth="260px"; img.style.border="1px solid #eee"; img.style.borderRadius="8px"; img.style.marginTop="4px";
        b.appendChild(img);
      });

      // Actions (edit/delete + reactions)
      const act = document.createElement("div"); act.className = "msg-actions";
      // Edit/Delete chỉ cho chủ sở hữu
      if (mine && !m.deleted){
        const btnEdit = document.createElement("button"); btnEdit.className="btn-xxs"; btnEdit.textContent="Sửa";
        btnEdit.onclick = () => startEditMessage(wrap, m);
        const btnDel = document.createElement("button"); btnDel.className="btn-xxs"; btnDel.textContent="Xoá";
        btnDel.onclick = () => doDeleteMessage(wrap, m);
        act.appendChild(btnEdit); act.appendChild(btnDel);
      }
      // Reaction bar
      const reactBar = document.createElement("div"); reactBar.className="react-bar";
      ["👍","❤️","😂","😮","😢","😡"].forEach(em=>{
        const pill = document.createElement("div");
        pill.className="react-pill";
        pill.dataset.emoji = em;
        const count = getReactionCount(m._id, em, m.reactions);
        pill.innerHTML = `<span>${em}</span><span class="cnt">${count||""}</span>`;
        if (userReacted(m._id, em, m.reactions)) pill.classList.add("active");
        pill.onclick = () => toggleReaction(m, em, pill);
        reactBar.appendChild(pill);
      });
      act.appendChild(reactBar);
      b.appendChild(act);

      wrap.appendChild(b);
      frag.appendChild(wrap);

      msgIndex.set(m._id, wrap);
    }

    if (appendTop){
      const prevH = box.scrollHeight;
      box.prepend(frag);
      box.scrollTop += (box.scrollHeight - prevH);
    } else {
      box.appendChild(frag);
      box.scrollTop = box.scrollHeight;
    }

    const btnMore = q("btnLoadMore");
    if (btnMore) btnMore.style.display = arr.length ? "inline-block" : "none";
  }

  // ===== Reaction helpers =====
  function ensureCR(mid){ if (!clientReactions.has(mid)) clientReactions.set(mid, {}); return clientReactions.get(mid); }
  function getReactionCount(mid, emoji, serverMap){
    const sv = serverMap && serverMap[emoji] ? serverMap[emoji].length : 0;
    const localMap = ensureCR(mid);
    const loc = localMap[emoji] ? localMap[emoji].size : 0;
    // Ưu tiên state local khi có; nếu không, dùng server
    return (loc || sv) || "";
  }
  function userReacted(mid, emoji, serverMap){
    const localMap = ensureCR(mid);
    if (localMap[emoji] && localMap[emoji].has(userId)) return true;
    if (serverMap && Array.isArray(serverMap[emoji])) return serverMap[emoji].includes(userId);
    return false;
  }
  async function toggleReaction(m, emoji, pillEl){
    const mid = m._id;
    const map = ensureCR(mid);
    map[emoji] = map[emoji] || new Set();
    const on = !map[emoji].has(userId);
    if (on) map[emoji].add(userId); else map[emoji].delete(userId);

    // UI cập nhật tức thì
    const cntEl = pillEl.querySelector(".cnt");
    const cur = Number(cntEl.textContent||"0");
    const next = on ? (cur?cur:0)+1 : Math.max((cur?cur:0)-1,0);
    cntEl.textContent = next || "";
    pillEl.classList.toggle("active", on);

    // Gửi server (không bắt buộc thành công)
    try { await reactMessage(mid, emoji, on); } catch {}
  }

  // ===== Edit / Delete message =====
  function startEditMessage(wrap, m){
    const body = wrap.querySelector(".msg-text");
    const actions = wrap.querySelector(".msg-actions");
    if (!body || !actions) return;

    // Khoá nút
    actions.style.pointerEvents="none"; actions.style.opacity=".6";

    // Hộp sửa
    const box = document.createElement("div");
    box.className="msg-edit-box";
    box.innerHTML = `
      <input class="msg-edit-input" type="text" value="${esc(m.text||"")}">
      <button class="btn-xxs" data-act="save">Lưu</button>
      <button class="btn-xxs" data-act="cancel">Huỷ</button>
    `;
    body.after(box);
    const ip = box.querySelector(".msg-edit-input"); ip.focus(); ip.select();

    const cleanup = () => { box.remove(); actions.style.pointerEvents=""; actions.style.opacity=""; };
    const save = async () => {
      const newText = ip.value.trim();
      if (!newText || newText === m.text) { cleanup(); return; }
      try{
        await patchMessage(m._id, { text: newText });
      }catch{}
      // Cập nhật UI bất kể server trả về gì
      m.text = newText; m.editedAt = Date.now();
      body.innerHTML = esc(newText).replace(/https?:\/\/[^\s]+/g, u => isImg(u)
        ? `<br><img src="${esc(u)}" style="max-width:260px;border:1px solid #eee;border-radius:8px;margin-top:4px">`
        : `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`);
      const meta = wrap.querySelector(".msg-meta");
      if (meta && !meta.querySelector(".edited-flag")){
        const ef = document.createElement("span"); ef.className="edited-flag"; ef.textContent="(đã chỉnh sửa)";
        meta.appendChild(ef);
      }
      cleanup();
    };

    box.addEventListener("click", (e)=>{
      const a = e.target.closest("[data-act]");
      if (!a) return;
      if (a.dataset.act === "save") save();
      if (a.dataset.act === "cancel") cleanup();
    });
    ip.addEventListener("keydown", e=>{
      if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); save(); }
      if (e.key === "Escape"){ e.preventDefault(); cleanup(); }
    });
  }
  async function doDeleteMessage(wrap, m){
    try{ await deleteMessage(m._id); }catch{}
    // Xoá mềm UI
    m.deleted = true; m.text="";
    const body = wrap.querySelector(".msg-text");
    if (body) body.innerHTML = "<i>Tin nhắn đã bị xoá</i>";
  }

  // ===== Backfill & open room =====
  async function backfill(pages = 2) {
    for (let i = 0; i < pages; i++) {
      const before = state.oldestTs ? String(state.oldestTs) : null;
      if (!before) break;
      let more = [];
      if (state.mode === "dm" && state.otherId) more = await fetchDM(state.otherId, { before, limit: 50 });
      if (state.mode === "group" && state.conversationId) more = await fetchGroupMsgs(state.conversationId, { before, limit: 50 });
      if (!more.length) break;
      renderMessages(more, { appendTop: true });
    }
  }

  // Draft per room
  function loadDraft(){
    msgInput = q("msgInput") || document.querySelector("textarea#msgInput");
    if (!msgInput) return;
    const key = roomKey(); if (!key) return;
    const v = localStorage.getItem(`draft:${key}`) || "";
    msgInput.value = v;
  }
  function saveDraft(){
    if (!msgInput) return;
    const key = roomKey(); if (!key) return;
    localStorage.setItem(`draft:${key}`, msgInput.value || "");
  }

async function openDM(otherId,name){
    state.mode="dm"; state.otherId=otherId; state.conversationId=null;
    q("roomTitle").textContent=`Chat riêng với ${name}`;
    // Ẩn nút nhóm
    ["btnMembers","btnInvite","btnLeaveGroup"].forEach(id=>{ const el=q(id); if(el) el.style.display="none"; });
    // ... load tin nhắn DM ở đây
  }
  
  // ===== Upload & Send =====
  async function upload(files){
    if (!files || !files.length) return [];
    const fd = new FormData();
    [...files].forEach(f => fd.append("files", f));
    const r = await fetch("/api/upload", { method:"POST", headers, body: fd });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(d.error || "Upload lỗi");
    return d.files || [];
  }

  on(q("btnSend"), "click", sendMessage);
  function getInput(){ return q("msgInput") || document.querySelector("textarea#msgInput"); }

  async function sendMessage(){
    try{
      const ta = getInput(); msgInput = ta;
      const text = (ta?.value||"").trim();
      let files = [];
      const f = q("fileInput")?.files;
      if (f && f.length) files = await upload(f);
      if (!text && !files.length) return;

      let payload;
      if (state.mode === "dm" && state.otherId) payload = await sendDM(state.otherId, { to: state.otherId, text, attachments: files });
      else if (state.mode === "group" && state.conversationId) payload = await sendGroup(state.conversationId, { text, attachments: files });
      else { showBanner("Hãy mở một cuộc trò chuyện trước.", true); return; }

      renderMessages([payload], { appendTop: false });
      if (ta){ ta.value=""; saveDraft(); }
      const fileEl = q("fileInput"); if (fileEl) fileEl.value="";
      emitTypingStop();
    }catch(e){ showBanner(`Gửi tin lỗi: ${e.message}`, true); }
  }

  // drag-drop upload
  on(q("messages"), "dragover", e => { e.preventDefault(); });
  on(q("messages"), "drop", async e => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files||[])];
    if (!files.length) return;
    try{
      const uploaded = await upload(files);
      let payload;
      if (state.mode === "dm" && state.otherId) payload = await sendDM(state.otherId, { to: state.otherId, text:"", attachments: uploaded });
      else if (state.mode === "group" && state.conversationId) payload = await sendGroup(state.conversationId, { text:"", attachments: uploaded });
      if (payload) renderMessages([payload]);
    }catch(err){ showBanner(`Upload lỗi: ${err.message}`, true); }
  });

  // Image lightbox
  on(q("messages"), "click", e=>{
    const t = e.target;
    if (t.tagName === "IMG" && t.closest(".msg")){
      q("lightboxImg").src = t.src;
      q("lightbox").style.display = "flex";
    }
  });
  on(q("lightbox"), "click", ()=>{ q("lightbox").style.display="none"; });

  // Load more
  on(q("btnLoadMore"), "click", async ()=>{
    const before = state.oldestTs ? String(state.oldestTs) : null;
    if (!before) return;
    try{
      let more=[];
      if (state.mode==="dm" && state.otherId) more = await fetchDM(state.otherId, { before, limit:50 });
      if (state.mode==="group" && state.conversationId) more = await fetchGroupMsgs(state.conversationId, { before, limit:50 });
      renderMessages(more, { appendTop:true });
    }catch(e){ showBanner(`Tải thêm lỗi: ${e.message}`, true); }
  });

  // ===== Typing indicator =====
  let typingTimer = null;
  const typingUsers = new Map(); // key userId -> {name, until, room}
  function emitTypingStart(){
    if (!socket) return;
    const room = roomKey(); if (!room) return;
    socket.emit("typing:start", { room, userId, name:userName });
  }
  function emitTypingStop(){
    if (!socket) return;
    const room = roomKey(); if (!room) return;
    socket.emit("typing:stop", { room, userId });
  }
  function updateTypingPill(){
    const room = roomKey(); if (!room){ typingPill.style.display="none"; return; }
    // Clear expired
    const now = Date.now();
    for (const [uid,info] of typingUsers){
      if (info.until < now || info.room !== room || String(uid)===String(userId)) typingUsers.delete(uid);
    }
    if (!typingUsers.size){ typingPill.style.display="none"; return; }
    const names = [...typingUsers.values()].map(x=>x.name||"Ai đó");
    const txt = names.length===1 ? `${names[0]} đang nhập…` : `${names.slice(0,2).join(", ")}${names.length>2?` +${names.length-2}`:""} đang nhập…`;
    typingPill.textContent = txt;
    typingPill.style.display="block";
  }
  function scheduleTypingStop(){
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(emitTypingStop, 1800);
  }
  // Bind input
  (function bindInput(){
    const ta = getInput();
    if (!ta) return;
    msgInput = ta;
    on(ta, "input", ()=>{ emitTypingStart(); scheduleTypingStop(); saveDraft(); maybeShowMentions(); });
    on(ta, "keydown", (e)=>{ if (e.key==="Enter" && !e.shiftKey && q("enterToggle")?.checked){ e.preventDefault(); sendMessage(); } });
  })();

  // Socket listeners for typing
  let socket = null;
  try { socket = io("/", { auth: { userId } }); } catch { debug("SocketIO không khả dụng"); }
  if (socket){
    socket.on("typing:start", ({room, userId:uid, name})=>{
      typingUsers.set(String(uid), { name, until: Date.now()+2200, room });
      updateTypingPill();
    });
    socket.on("typing:stop", ({room, userId:uid})=>{
      typingUsers.delete(String(uid));
      updateTypingPill();
    });
  }
  setInterval(updateTypingPill, 900);

  // ===== Mentions (@) =====
  function friendsForMention(){
    return (state.friends||[]).map(f=>({
      id: String(f._id||f.id||""),
      name: f.username || f.name || (f.email||""),
      avatar: f.avatarUrl || "/img/avatar-default.png"
    }));
  }
  function caretRect(el){
    // vị trí đơn giản: neo theo textarea (tránh tính toán caret phức tạp)
    const r = el.getBoundingClientRect();
    return { x: r.left+10, y: r.bottom+6 };
  }
  function maybeShowMentions(){
    const ta = getInput(); if (!ta) return;
    const val = ta.value;
    const at = /@([^\s@]{1,24})$/.exec(val.slice(0, ta.selectionStart));
    if (!at){ mentionBox.style.display="none"; return; }
    const key = at[1].toLowerCase();
    const list = friendsForMention().filter(u => (u.name||"").toLowerCase().startsWith(key)).slice(0,8);
    if (!list.length){ mentionBox.style.display="none"; return; }

    const pos = caretRect(ta);
    mentionBox.style.left = `${pos.x}px`;
    mentionBox.style.top = `${pos.y}px`;
    mentionBox.innerHTML = list.map(u=>`
      <div class="itm" data-id="${esc(u.id)}" data-name="${esc(u.name)}">
        <img src="${esc(u.avatar)}" style="width:22px;height:22px;border-radius:999px">
        <span>@${esc(u.name)}</span>
      </div>`).join("");
    mentionBox.style.display="block";
  }
  on(document, "click", e=>{
    const it = e.target.closest("#mentionBox .itm");
    if (!it) { if (!e.target.closest("#mentionBox")) mentionBox.style.display="none"; return; }
    const name = it.dataset.name;
    const ta = getInput(); if (!ta) return;
    const upTo = ta.value.slice(0, ta.selectionStart).replace(/@([^\s@]{1,24})$/, "@"+name+" ");
    ta.value = upTo + ta.value.slice(ta.selectionStart);
    mentionBox.style.display="none";
    ta.focus(); saveDraft();
  });

  // ===== Friends / Groups bootstrap =====
  async function bootstrapLists(){
    try{
      let friends=[],groups=[];
      try { friends = await fetchFriends(); } catch (e) { debug("Load friends lỗi"); }
      try { groups = await fetchGroups(); } catch (e) { debug("Load groups lỗi"); }
      renderFriends(friends);
      renderGroups(groups);
    }catch(e){ showBanner(`Bootstrap lỗi: ${e.message}`, true); }
  }
  async function bootstrap(){ hideBanner(); await bootstrapLists();renderMyInfo();   }
  bootstrap();

  // ===== Incoming messages / unread =====
  if (socket){
    socket.on("message:new", m=>{
      const n = normMsg(m, { conversationId: state.conversationId, otherId: state.otherId });
      // Nếu đang mở đúng phòng thì render ngay
      if (state.mode==="dm" && state.otherId){
        const a = String(n.senderId), b = String(n.receiver);
        const ok = (a===String(userId) && b===state.otherId) || (b===String(userId) && a===state.otherId);
        if (ok) return renderMessages([n]);
      }
      if (state.mode==="group" && String(state.conversationId)===String(n.conversationId)){
        return renderMessages([n]);
      }
      // tăng badge chưa đọc
      const gid = n.conversationId;
      if (gid){
        unread[gid] = (unread[gid]||0)+1;
        const bd = q(`badge-${gid}`); if (bd){ bd.textContent=String(unread[gid]); bd.style.display='inline-block'; }
      }
    });
  }

  // ===== Group create / Join via UI nếu có =====
  on(q("btnCreateGroup"), "click", async ()=>{
    const name = (q("groupName")?.value||"").trim();
    const raw = (q("groupMembers")?.value||"").trim();
    const ids = raw? raw.split(",").map(s=>s.trim()).filter(Boolean) : [];
    const cbs = [...document.querySelectorAll("#friendCheckboxList input[type=checkbox]:checked")].map(cb=>cb.value);
    const memberIds = [...new Set([...ids, ...cbs])];
    if (!name || memberIds.length < 2){ showBanner("Cần tên nhóm và ít nhất 2 thành viên", true); return; }
    try{
      const r = await apiPost("/api/groups/create", { name, memberIds });
      q("groupName").value=""; q("groupMembers").value="";
      await bootstrapLists();
      openGroup(r._id||r.id, r.name||name);
    }catch(e){ showBanner(e.message, true); }
  });
  on(q("btnJoinGroup"), "click", async ()=>{
    const gid = (q("joinGroupId")?.value||"").trim();
    if (!gid){ showBanner("Nhập groupId", true); return; }
    try{
      await apiPost("/api/groups/join", { conversationId: gid });
      await bootstrapLists();
      openGroup(gid, `Nhóm ${gid}`);
    }catch(e){ showBanner(e.message, true); }
  });

  // Giữ nguyên toàn bộ code cũ...
  // (đoạn đầu Helpers, Auth, Render, Messages v.v. không thay đổi)

  // ==== Group management bổ sung ====

  // Khi mở group: bật các nút
  // ... các phần trên giữ nguyên (Helpers, Auth, Render, Messages v.v.)

async function openGroup(gid, name){
  state.mode="group"; state.conversationId=String(gid); state.otherId=null; state.oldestTs=null;
  unread[gid]=0; const bd = q(`badge-${gid}`); if (bd){ bd.textContent='0'; bd.style.display='none'; }
  const t = q("roomTitle"); if (t) t.textContent = `Nhóm: ${name}`;

  const first = await fetchGroupMsgs(gid, { limit: 50 });
  renderMessages(first, { replace: true });
  await backfill(2);
  loadDraft();

  // Bật nút quản lý nhóm
  ["btnMembers","btnInvite","btnLeaveGroup"].forEach(id=>{
    const el=q(id); if(el) el.style.display="inline-block";
  });

  // Lấy danh sách thành viên
  try{
    const r = await apiGet(`/api/groups/${gid}/members`);
    renderMembers(r.members||[]);
  }catch(e){ console.warn("Không lấy được thành viên", e); }
}
window.openGroup=openGroup;

// Render danh sách thành viên
function renderMembers(members){
  const list = q("membersList");
  if(!list) return;
  list.innerHTML="";
  members.forEach(m=>{
    const li=document.createElement("li");
    li.textContent = `${m.username||m.name||m.email||m._id}`;
    list.appendChild(li);
  });
  q("membersPanel").style.display="block";
  const mc = q("memberCount"); if(mc) mc.textContent = members.length;
}

// ==== Group management buttons ====
on(q("btnMembers"),"click", async ()=>{
  if(!state.conversationId) return;
  try{
    const r = await apiGet(`/api/groups/${state.conversationId}/members`);
    renderMembers(r.members||[]);
  }catch(e){ showBanner("Không lấy được thành viên", true); }
});
async function createInvite(gid){
  const c = [
    () => apiPost(`/api/groups/${gid}/invite`,{}),
    () => apiPost(`/api/groups/${gid}/invites`,{}),
    () => apiPost("/api/groups/invite",{ conversationId: gid })
  ];
  for (const fn of c){
    try { return await fn(); } catch{}
  }
  throw new Error("Không tạo được mã mời");
}

on(q("btnInvite"),"click", async ()=>{
  if(!state.conversationId) return;
  try{
    const r = await createInvite(state.conversationId);
    const code = r.code || r.inviteCode || r.token;
    if(code){
      // Tạo khung hiển thị mã mời
      const panel = document.createElement("div");
      panel.className = "card";
      panel.style.marginTop = "8px";
      panel.innerHTML = `
        <h4>Mã mời nhóm</h4>
        <div class="row" style="gap:8px;align-items:center">
          <input id="inviteCodeBox" class="input" style="flex:1" readonly value="${code}">
          <button id="btnCopyInvite" class="btn btn-sm">📋 Copy</button>
        </div>
      `;
      // Chèn vào ngay dưới title
      const main = q("membersPanel") || q("roomTitle").parentElement;
      main.after(panel);

      // Gắn sự kiện copy
      const btn = panel.querySelector("#btnCopyInvite");
      btn.onclick = ()=>{
        const ip = panel.querySelector("#inviteCodeBox");
        ip.select();
        document.execCommand("copy");
        showBanner("Đã copy mã mời vào clipboard!");
      };
    } else {
      showBanner("Server không trả về mã mời", true);
    }
  }catch(e){ showBanner("Không tạo được mã mời", true); }
});


on(q("btnJoinByCode"),"click", async ()=>{
  const code=(q("inviteCode")?.value||"").trim();
  if(!code) return showBanner("Nhập mã mời", true);
  try{
    const r = await apiPost("/api/groups/joinByCode",{ code });
    await bootstrapLists();
    openGroup(r._id||r.id, r.name||("Nhóm "+code));
  }catch(e){ showBanner("Không tham gia được bằng mã", true); }
});

on(q("btnAddMember"),"click", async ()=>{
  const uid=(q("newMember")?.value||"").trim();
  if(!uid||!state.conversationId) return;
  try{
    await apiPost(`/api/groups/${state.conversationId}/addMember`,{ userId: uid });
    q("newMember").value="";
    const r=await apiGet(`/api/groups/${state.conversationId}/members`);
    renderMembers(r.members||[]);
  }catch(e){ showBanner("Không thêm được thành viên", true); }
});

on(q("btnRemoveMember"),"click", async ()=>{
  const uid=(q("removeMember")?.value||"").trim();
  if(!uid||!state.conversationId) return;
  try{
    await apiPost(`/api/groups/${state.conversationId}/removeMember`,{ userId: uid });
    q("removeMember").value="";
    const r=await apiGet(`/api/groups/${state.conversationId}/members`);
    renderMembers(r.members||[]);
  }catch(e){ showBanner("Không xoá được thành viên", true); }
});
async function leaveGroup(gid){
  const c = [
    () => apiPost(`/api/groups/${gid}/leave`,{}),
    () => apiPost("/api/groups/leave",{ conversationId: gid }),
    () => apiDelete(`/api/groups/${gid}/leave`),
    () => apiDelete(`/api/groups/${gid}`)
  ];
  for (const fn of c){
    try { return await fn(); } catch{}
  }
  throw new Error("Không rời được nhóm");
}

on(q("btnLeaveGroup"),"click", async ()=>{
  if(!state.conversationId) return;
  if(!confirm("Bạn chắc chắn muốn rời nhóm?")) return;
  try{
    await leaveGroup(state.conversationId);
    q("membersPanel").style.display="none";
    ["btnMembers","btnInvite","btnLeaveGroup"].forEach(id=>{
      const el=q(id); if(el) el.style.display="none";
    });
    await bootstrapLists();
  }catch(e){ showBanner("Không rời được nhóm", true); }
});

// ===== Friend search =====
async function searchUsers(keyword) {
  try {
    const res = await apiGet(`/api/users/search?q=${encodeURIComponent(keyword)}`);
    return Array.isArray(res) ? res : (res.users || []);
  } catch (e) {
    showBanner("Lỗi tìm kiếm: " + e.message, true);
    return [];
  }
}





on(q("btnSearchUser"), "click", async ()=>{
  const key = q("qUser").value.trim();
  if (!key) return;
  try {
    const users = await searchUsers(key);
    renderSearch(users);
  } catch(e) {
    showBanner("Tìm bạn lỗi: " + e.message, true);
  }
});
function renderSearch(users){
  const root = q("searchUsers");
  if(!root) return;
  root.innerHTML="";

  if(!users || !users.length){
    root.innerHTML = "<li>Không tìm thấy người dùng nào</li>";
    return;
  }

  users.forEach(u=>{
    const uid = u._id || u.id;
    const name = u.username || u.name || u.email || ("user:" + uid);
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${esc(name)}</span>
      <button class="btn btn-sm add">Kết bạn</button>
      <button class="btn btn-sm chat">Chat</button>
    `;
    li.querySelector(".add").onclick = ()=>addFriend(uid);
    li.querySelector(".chat").onclick = ()=>openDM(uid,name);
    root.appendChild(li);
  });
}


async function addFriend(uid){
  try{
    const endpoints = [
      () => apiPost("/api/friends/add", { userId: uid }),
      () => apiPost("/api/friends", { userId: uid }),
      () => apiPost("/api/users/add-friend", { id: uid })
    ];
    for(const fn of endpoints){
      try {
        await fn();
        showBanner("✅ Đã gửi lời mời kết bạn!");
        await bootstrapLists();
        return;
      }catch{}
    }
    throw new Error("Không có endpoint nào chạy được");
  }catch(e){
    showBanner("Không thể kết bạn: "+e.message,true);
  }
}


// ... các phần dưới (Logout, Reload, beforeunload) giữ nguyên

  // Giữ nguyên các phần code cũ khác...


  // ===== Misc =====
  on(q("btnLogout"), "click", ()=>{ localStorage.clear(); location.href="/index.html"; });
  on(q("btnReload"), "click", ()=>bootstrap());
  on(q("btnHardReload"), "click", ()=>location.reload());
  on(window, "beforeunload", ()=>saveDraft());
})();
