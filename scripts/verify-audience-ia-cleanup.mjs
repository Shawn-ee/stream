import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { io } from "socket.io-client";

const base=process.env.API_BASE_URL??"http://127.0.0.1:3001";
const password=process.env.LOCAL_DEMO_PASSWORD??"Local-demo-2026!";
const login=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({handle:"demo-audience",password})});
assert.equal(login.status,200);
const cookie=login.headers.getSetCookie().map((item)=>item.split(";")[0]).join("; ");
const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
try{
  const before=(await db.query("SELECT (SELECT COUNT(*) FROM creator_onboarding)::int onboarding,(SELECT COUNT(*) FROM streamer_profiles)::int profiles,(SELECT COUNT(*) FROM live_rooms)::int rooms,(SELECT COUNT(*) FROM follows)::int follows,(SELECT COUNT(*) FROM wallet_ledger)::int wallet,(SELECT COUNT(*) FROM notifications)::int notifications")).rows[0];
  for(const path of ["/api/creator/onboarding","/api/broadcast/access","/api/me/history","/api/me/notifications"])assert.ok([200,403].includes((await fetch(`${base}${path}`,{headers:{cookie}})).status));
  const after=(await db.query("SELECT (SELECT COUNT(*) FROM creator_onboarding)::int onboarding,(SELECT COUNT(*) FROM streamer_profiles)::int profiles,(SELECT COUNT(*) FROM live_rooms)::int rooms,(SELECT COUNT(*) FROM follows)::int follows,(SELECT COUNT(*) FROM wallet_ledger)::int wallet,(SELECT COUNT(*) FROM notifications)::int notifications")).rows[0];
  assert.deepEqual(after,before,"read-only navigation endpoints must not create persistent product resources");
  assert.equal((await fetch(`${base}/api/discovery/tags?type=COMMUNITY`)).status,410);
  const room=(await fetch(`${base}/api/rooms/demo-streamer`).then((response)=>response.json())).room;
  assert.notEqual(room.broadcast_state,"live");
  const history=await fetch(`${base}/api/rooms/demo-streamer/chat-history`,{headers:{cookie}}).then((response)=>response.json());
  assert.deepEqual(history.messages,[]);assert.equal(history.archived,true);
  const socket=io(base,{transports:["websocket"],extraHeaders:{Cookie:cookie}});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("offline join timed out")),5000);socket.on("connect",()=>socket.emit("room:join","demo-streamer",(result)=>{clearTimeout(timer);try{assert.equal(result.error,"room_offline");resolve();}catch(error){reject(error);}}));socket.on("connect_error",reject);});
  socket.disconnect();
  const [app,route,navigation,roomComponent,api]=await Promise.all([readFile("apps/web/src/main.tsx","utf8"),readFile("apps/web/src/audience-route.ts","utf8"),readFile("apps/web/src/components/navigation.tsx","utf8"),readFile("apps/web/src/components/room.tsx","utf8"),readFile("apps/api/src/index.ts","utf8")]);
  assert.doesNotMatch(app,/>Tags</);assert.doesNotMatch(app,/community-discovery|For You preferences|AudienceShelf/);
  assert.match(app,/api\/me\/history\?page=/);assert.match(app,/api\/me\/notifications\?page=/);
  assert.match(api,/LIMIT 21 OFFSET \$2/);
  assert.match(route,/legacy-discovery/);assert.match(route,/following\|activity\|notifications/);
  for(const label of ["Following","Activity","Notifications","Wallet","Settings"])assert.match(navigation,new RegExp(label));
  assert.match(app,/onSubmit=\{submitGlobalSearch\}/);assert.match(app,/const path=`\/\$\{params\.size/);
  assert.match(app,/if\(!supportAvailable\)return <section className="workspace audience-room offline-room-simple"/);
  assert.match(app,/supportAvailable\?<VideoActivityOverlay/);assert.match(app,/supportAvailable\?<LiveChatPanel/);assert.match(roomComponent,/chatEnabled\?<button/);
  console.log("Audience IA routes, Community removal, global search, navigation side-effect safety, and offline realtime refusal verified.");
}finally{await db.end();}
