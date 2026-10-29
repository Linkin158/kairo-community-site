/* ============================================================
 * Kairo 光影社区 · 数据层
 * 自动双模式：
 *  - 云端：config.supabaseUrl / anonKey 已填 → Supabase PostgREST + Storage
 *  - 本地：未填 → localStorage 演示模式（仅本机可见，便于先看效果）
 * ============================================================ */

/* ---------- 通用工具 ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg){
  let t=$('#toast'); if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.style.display='block';clearTimeout(window.__tk);window.__tk=setTimeout(()=>t.style.display='none',2200);
}

function fmtTime(iso){
  if(!iso)return '';
  const d=new Date(iso); if(isNaN(d))return '';
  const now=new Date(), diff=(now-d)/1000;
  if(diff<60)return '刚刚';
  if(diff<3600)return Math.floor(diff/60)+'分钟前';
  if(diff<86400)return Math.floor(diff/3600)+'小时前';
  if(diff<86400*7)return Math.floor(diff/86400)+'天前';
  const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function boardName(key){ const b=SITE_CONFIG.boards.find(x=>x.key===key); return b?b.name:key; }

/* ---------- 匿名身份（本机留存，不注册登录） ---------- */
const IDENTITY = (() => {
  let seed=localStorage.getItem('kf-seed');
  if(!seed){ seed=(crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2)); localStorage.setItem('kf-seed',seed); }
  const pool=['光影旅人','街角快门','慢门玩家','胶片青年','逆光行者','薄雾镜头','秋日胶片','雪山记录者','夜跑摄影师','晨光拾遗'];
  let nick=localStorage.getItem('kf-nick');
  if(!nick){ nick=pool[Math.floor(Math.random()*pool.length)]+'-'+Math.floor(1000+Math.random()*9000); localStorage.setItem('kf-nick',nick); }
  return {
    seed,
    get nick(){ return nick; },
    setNick(v){ v=(v||'').trim().slice(0,16); if(!v)return false; nick=v; localStorage.setItem('kf-nick',v); return true; }
  };
})();

/* ---------- 模式判定 ---------- */
const IS_CLOUD = !!(SITE_CONFIG.supabaseUrl && SITE_CONFIG.supabaseAnonKey);
const REST = SITE_CONFIG.supabaseUrl.replace(/\/+$/,'') + '/rest/v1';
const HDR = {
  'apikey': SITE_CONFIG.supabaseAnonKey,
  'Authorization': 'Bearer ' + SITE_CONFIG.supabaseAnonKey,
  'Content-Type': 'application/json'
};

/* ---------- 本地存储（演示模式） ---------- */
const LOCAL_KEY='kf-data';
function loadLocal(){ try{ return JSON.parse(localStorage.getItem(LOCAL_KEY))||{topics:[],replies:[]}; }catch{ return {topics:[],replies:[]}; } }
function saveLocal(d){ localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); }
function newId(){ return Date.now().toString(36)+Math.random().toString(16).slice(2,8); }

/* ---------- 数据 API（云端/本地同一签名） ---------- */
const API = {
  mode(){ return IS_CLOUD ? 'cloud' : 'local'; },

  async listTopics(board){
    if(IS_CLOUD){
      let url=`${REST}/topics?select=*&order=created_at.desc&limit=${SITE_CONFIG.pageSize}`;
      if(board && board!=='all') url+=`&board=eq.${encodeURIComponent(board)}`;
      const r=await fetch(url,{headers:HDR}); if(!r.ok)throw new Error('list topics '+r.status);
      return r.json();
    }
    const d=loadLocal();
    let arr=d.topics.slice();
    if(board && board!=='all') arr=arr.filter(t=>t.board===board);
    return arr.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  },

  async getTopic(id){
    if(IS_CLOUD){
      const r=await fetch(`${REST}/topics?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,{headers:HDR});
      const arr=await r.json(); return arr[0]||null;
    }
    const d=loadLocal(); return d.topics.find(t=>String(t.id)===String(id))||null;
  },

  async listReplies(topicId){
    if(IS_CLOUD){
      const r=await fetch(`${REST}/replies?topic_id=eq.${encodeURIComponent(topicId)}&select=*&order=created_at.asc`,{headers:HDR});
      if(!r.ok)throw new Error('list replies '+r.status); return r.json();
    }
    return loadLocal().replies.filter(x=>String(x.topic_id)===String(topicId))
      .sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
  },

  async createTopic(payload){
    const row={
      title:payload.title, body:payload.body, board:payload.board,
      author_name:IDENTITY.nick, author_seed:IDENTITY.seed,
      image_path:payload.imageUrl||null, reply_count:0, views:0,
      created_at:new Date().toISOString()
    };
    if(IS_CLOUD){
      const r=await fetch(`${REST}/topics`,{method:'POST',headers:{...HDR,'Prefer':'return=representation'},body:JSON.stringify(row)});
      if(!r.ok)throw new Error('create topic '+r.status+' '+await r.text());
      const arr=await r.json(); return arr[0];
    }
    const d=loadLocal(); row.id=newId(); d.topics.unshift(row); saveLocal(d); return row;
  },

  async createReply(topicId,payload){
    const row={ topic_id:topicId, author_name:IDENTITY.nick, author_seed:IDENTITY.seed,
      body:payload.body, image_path:payload.imageUrl||null, created_at:new Date().toISOString() };
    if(IS_CLOUD){
      await fetch(`${REST}/replies`,{method:'POST',headers:{...HDR,'Prefer':'return=representation'},body:JSON.stringify(row)});
      // 楼层数 +1
      const cur=await (await fetch(`${REST}/topics?id=eq.${encodeURIComponent(topicId)}&select=reply_count`,{headers:HDR})).json();
      const n=(cur[0]?.reply_count||0)+1;
      await fetch(`${REST}/topics?id=eq.${encodeURIComponent(topicId)}`,{method:'PATCH',headers:HDR,body:JSON.stringify({reply_count:n})});
      return row;
    }
    const d=loadLocal(); row.id=newId(); d.replies.push(row);
    const t=d.topics.find(x=>String(x.id)===String(topicId)); if(t) t.reply_count=(t.reply_count||0)+1;
    saveLocal(d); return row;
  },

  async incViews(id){
    if(IS_CLOUD){ const cur=await (await fetch(`${REST}/topics?id=eq.${encodeURIComponent(id)}&select=views`,{headers:HDR})).json();
      await fetch(`${REST}/topics?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:HDR,body:JSON.stringify({views:(cur[0]?.views||0)+1})}); return; }
    const d=loadLocal(); const t=d.topics.find(x=>String(x.id)===String(id)); if(t){ t.views=(t.views||0)+1; saveLocal(d); }
  },

  async deleteTopic(id){
    if(IS_CLOUD){ await fetch(`${REST}/topics?id=eq.${encodeURIComponent(id)}&author_seed=eq.${encodeURIComponent(IDENTITY.seed)}`,{method:'DELETE',headers:HDR}); return; }
    const d=loadLocal(); d.topics=d.topics.filter(t=>!(String(t.id)===String(id)&&t.author_seed===IDENTITY.seed));
    d.replies=d.replies.filter(r=>String(r.topic_id)!==String(id)); saveLocal(d);
  },

  async deleteReply(id){
    if(IS_CLOUD){ await fetch(`${REST}/replies?id=eq.${encodeURIComponent(id)}&author_seed=eq.${encodeURIComponent(IDENTITY.seed)}`,{method:'DELETE',headers:HDR}); return; }
    const d=loadLocal(); d.replies=d.replies.filter(r=>!(String(r.id)===String(id)&&r.author_seed===IDENTITY.seed)); saveLocal(d);
  },

  /* 图片：云端上传到 Storage 桶；本地直接用 DataURL */
  async uploadImage(dataUrl){
    if(!IS_CLOUD) return dataUrl;
    const base=SITE_CONFIG.supabaseUrl.replace(/\/+$/,'');
    const blob=await (await fetch(dataUrl)).blob();
    const ext=(dataUrl.match(/image\/(\w+)/)||[])[1]||'png';
    const path=`${new Date().toISOString().replace(/[:.]/g,'-')}-${Math.random().toString(16).slice(2,8)}.${ext}`;
    const r=await fetch(`${base}/storage/v1/object/${SITE_CONFIG.storageBucket}/${path}`,{
      method:'POST',
      headers:{ 'apikey':SITE_CONFIG.supabaseAnonKey,'Authorization':'Bearer '+SITE_CONFIG.supabaseAnonKey,'Content-Type':blob.type||'image/png' },
      body:blob
    });
    if(!r.ok) throw new Error('upload image '+r.status);
    return `${base}/storage/v1/object/public/${SITE_CONFIG.storageBucket}/${path}`;
  }
};

/* 顶栏昵称改名（三个页面共用） */
function renderTopbar(activePage){
  const cloud=API.mode()==='cloud';
  $('#topbar').innerHTML=`
    <div class="brand">${esc(SITE_CONFIG.siteName)}<span>KAIRO</span></div>
    <div class="nick-chip">
      <span class="avatar">${esc(IDENTITY.nick.slice(0,1))}</span>
      <span id="nickText">${esc(IDENTITY.nick)}</span>
      <button onclick="renameNick()">改名</button>
    </div>`;
  const bar=$('#modebar');
  if(bar){ bar.className='modebar'+(cloud?' cloud':'');
    bar.textContent = cloud ? '云端模式：帖子与回复同步到 Supabase，社区成员可见' : '本地演示模式：数据仅保存在本浏览器；填入 config.js 后端参数后切换云端'; }
}
function renameNick(){
  const v=prompt('输入新的匿名昵称（16字以内）', IDENTITY.nick);
  if(v===null)return;
  if(IDENTITY.setNick(v)){ $('#nickText').textContent=IDENTITY.nick; toast('昵称已更新'); }
  else toast('昵称不能为空');
}
