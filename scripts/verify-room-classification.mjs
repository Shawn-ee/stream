import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const password = process.env.LOCAL_DEMO_PASSWORD ?? "Local-demo-2026!";
const db = new Client({ connectionString: process.env.DATABASE_URL });
let customTagId = null;
function authState(response) { const pairs=response.headers.getSetCookie().map((item)=>item.split(";")[0]); return {cookie:pairs.join("; "),csrf:pairs.find((item)=>item.startsWith("stream_csrf="))?.slice(12)}; }
async function login(handle) { const response=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({handle,password})}); assert.equal(response.status,200); return authState(response); }
async function call(path,auth,options={}) { const response=await fetch(`${base}${path}`,{method:options.method??"GET",headers:{...(auth?{cookie:auth.cookie}:{}),...(auth&&options.method&&options.method!=="GET"?{"x-csrf-token":auth.csrf}:{}),...(options.body!==undefined?{"content-type":"application/json"}:{})},body:options.body===undefined?undefined:JSON.stringify(options.body)}); return {status:response.status,body:await response.json()}; }

await db.connect();
const streamer=await login("demo-streamer");
const audience=await login("demo-audience");
const beforeCount=await db.query("SELECT COUNT(*)::int count FROM live_rooms");
const studio=await call("/api/streamer/studio",streamer);
assert.equal(studio.status,200);
assert.equal((await db.query("SELECT COUNT(*)::int count FROM live_rooms")).rows[0].count,beforeCount.rows[0].count,"opening Studio must not create a room");
const slug=studio.body.room.slug;
const original={title:studio.body.room.title,primaryLanguage:studio.body.room.languages[0].code,additionalLanguages:studio.body.room.languages.slice(1).map((item)=>item.code),tagIds:studio.body.room.tags.map((item)=>item.id)};
try {
  const languages=await call("/api/discovery/languages",null);
  assert.deepEqual(languages.body.languages.map((item)=>item.code),["en","zh","es","ja","ko","fr","de","pt","ar","hi"]);
  const publicTags=await call("/api/discovery/tags",null);
  const music=publicTags.body.tags.find((item)=>item.slug==="music");
  assert.ok(music);
  assert.equal((await call("/api/studio/tags",audience,{method:"POST",body:{name:"Audience Tag"}})).status,403,"audience users cannot create public tags");
  assert.equal((await call("/api/studio/tags",streamer,{method:"POST",body:{name:"Trending"}})).status,400,"reserved system labels cannot be creator-created");
  const customName=`Studio Topic ${Date.now()}`;
  const custom=await call("/api/studio/tags",streamer,{method:"POST",body:{name:customName}});
  assert.equal(custom.status,201);
  assert.equal(custom.body.tag.type,"CONTENT");
  customTagId=custom.body.tag.id;
  const duplicate=await call("/api/studio/tags",streamer,{method:"POST",body:{name:customName}});
  assert.equal(duplicate.status,200); assert.equal(duplicate.body.tag.id,customTagId);
  assert.equal((await call("/api/discovery/tags?type=COMMUNITY",null)).status,410);
  const updated=await call(`/api/streamer/rooms/${slug}`,streamer,{method:"PUT",body:{title:original.title,primaryLanguage:"en",additionalLanguages:["zh","ja"],tagIds:[music.id,customTagId]}});
  assert.equal(updated.status,200);
  assert.deepEqual(updated.body.room.languages.map((item)=>item.code),["en","zh","ja"]);
  assert.equal(updated.body.room.languages.filter((item)=>item.isPrimary).length,1);
  assert.deepEqual(updated.body.room.tags.map((item)=>item.id),[music.id,customTagId]);
  const communityTag=await db.query("SELECT id FROM tags WHERE tag_type='COMMUNITY' LIMIT 1");
  assert.equal((await call(`/api/streamer/rooms/${slug}`,streamer,{method:"PUT",body:{primaryLanguage:"en",additionalLanguages:[],tagIds:[communityTag.rows[0].id]}})).status,400);
  for (const body of [{primaryLanguage:"en",additionalLanguages:["zh","ja","ko"],tagIds:[]},{primaryLanguage:"en",additionalLanguages:["en"],tagIds:[]},{primaryLanguage:"xx",additionalLanguages:[],tagIds:[]}]) assert.equal((await call(`/api/streamer/rooms/${slug}`,streamer,{method:"PUT",body})).status,400);
  assert.equal((await call(`/api/streamer/rooms/${slug}`,streamer,{method:"PUT",body:{category:"Music"}})).status,400);
  const systemTag=await db.query("SELECT id FROM tags WHERE tag_type='SYSTEM' LIMIT 1");
  assert.equal((await call(`/api/streamer/rooms/${slug}`,streamer,{method:"PUT",body:{primaryLanguage:"en",additionalLanguages:[],tagIds:[systemTag.rows[0].id]}})).status,400);
  const filtered=await call("/api/rooms?languages=zh,ja&tag=music",null);
  assert.equal(filtered.status,200);
  assert.ok(filtered.body.rooms.some((room)=>room.slug===slug));
  assert.ok(filtered.body.rooms.every((room)=>room.publication_status===undefined));
  assert.ok(filtered.body.rooms.every((room)=>room.language_codes===undefined&&room.tag_slugs===undefined));
  assert.equal((await call("/api/rooms?languages=en,zh,es,ja",null)).status,200,"audience filters may select more languages than one room can carry");
  const legacy=await call("/api/discovery/categories",null);
  assert.equal(legacy.status,410); assert.equal(legacy.body.replacement,"/api/discovery/tags");
  const invalidSets=await db.query("SELECT room_id FROM room_languages GROUP BY room_id HAVING COUNT(*) NOT BETWEEN 1 AND 3 OR COUNT(*) FILTER(WHERE is_primary)<>1 OR MIN(display_order) FILTER(WHERE is_primary)<>0");
  assert.equal(invalidSets.rowCount,0);
  const reports=await db.query("SELECT legacy_category,resolution,mapped_tag_slug FROM legacy_category_migration_report ORDER BY legacy_category");
  assert.ok(reports.rows.some((item)=>item.legacy_category==="Featured"&&item.resolution==="EXCLUDED_SYSTEM_DIMENSION"));
  assert.ok(reports.rows.some((item)=>item.legacy_category==="Music"&&item.mapped_tag_slug==="music"));
  const [app,cards,studioFields]=await Promise.all([readFile("apps/web/src/main.tsx","utf8"),readFile("apps/web/src/components/discovery.tsx","utf8"),readFile("apps/web/src/components/room-classification.tsx","utf8")]);
  const productSource=`${app}\n${cards}\n${studioFields}`;
  assert.doesNotMatch(productSource,/🇺🇸|🇨🇳|🇯🇵|🇰🇷|🇪🇸|🇫🇷|🇩🇪|🇵🇹|🇸🇦|🇮🇳/,"country flags must not be rendered");
  assert.match(cards,/room-language-labels/); assert.match(cards,/live-card-tags/); assert.match(studioFields,/Stream languages/); assert.doesNotMatch(studioFields,/>Category</);
  console.log("Structured room languages, controlled tags, migration mapping, public privacy, and no-navigation-side-effects verified.");
} finally {
  await call(`/api/streamer/rooms/${slug}`,streamer,{method:"PUT",body:original});
  if(customTagId){
    await db.query("DELETE FROM audit_events WHERE event_type='creator_tag_created' AND metadata->>'tagId'=$1",[customTagId]);
    await db.query("DELETE FROM tags WHERE id=$1",[customTagId]);
  }
  await db.end();
}
