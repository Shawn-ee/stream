import assert from "node:assert/strict";
import { Client } from "pg";

const base=process.env.API_BASE_URL??"http://127.0.0.1:3001";
const password="PublicProfile2026Password";
const suffix=Date.now().toString(36);
const ownerHandle=`profile_${suffix}`;
const viewerHandle=`viewer_${suffix}`;
const db=new Client({connectionString:process.env.DATABASE_URL});

function auth(response){const pairs=response.headers.getSetCookie().map(item=>item.split(";")[0]);return{cookie:pairs.join("; "),csrf:pairs.find(item=>item.startsWith("stream_csrf="))?.slice("stream_csrf=".length)}}
async function register(handle,displayName){const response=await fetch(`${base}/api/auth/register`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({handle,displayName,password,locale:"en"})});assert.equal(response.status,201);return auth(response);}
async function mutate(path,state,method,body){return fetch(`${base}${path}`,{method,headers:{cookie:state.cookie,"x-csrf-token":state.csrf,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});}

await db.connect();
try{
  const owner=await register(ownerHandle,"Public Profile Owner");
  const viewer=await register(viewerHandle,"Profile Viewer");
  const updated=await mutate("/api/account/profile",owner,"PATCH",{bio:"A concise public introduction.",publicProfileEnabled:false});
  assert.equal(updated.status,200);assert.equal((await updated.json()).publicProfile.enabled,false);
  assert.equal((await fetch(`${base}/api/users/${ownerHandle}/public`)).status,404,"private audience profile must not be public");
  assert.equal((await fetch(`${base}/api/users/${ownerHandle}/public`,{headers:{cookie:owner.cookie}})).status,200,"owner can preview a private profile");
  assert.equal((await mutate("/api/account/profile",owner,"PATCH",{publicProfileEnabled:true})).status,200);
  const before=(await db.query("SELECT (SELECT COUNT(*) FROM live_rooms)::int rooms,(SELECT COUNT(*) FROM follows)::int follows,(SELECT COUNT(*) FROM wallet_ledger)::int wallet")).rows[0];
  const response=await fetch(`${base}/api/users/${ownerHandle}/public`,{headers:{cookie:viewer.cookie}});assert.equal(response.status,200);const body=await response.json();
  assert.equal(body.profile.handle,ownerHandle);assert.equal(body.profile.bio,"A concise public introduction.");assert.equal(body.profile.isSelf,false);assert.equal(body.profile.creatorActive,false);
  for(const privateField of ["email","wallet","locale","ageAcknowledged","identityDocument","following"])assert.equal(privateField in body.profile,false,`${privateField} must remain private`);
  const after=(await db.query("SELECT (SELECT COUNT(*) FROM live_rooms)::int rooms,(SELECT COUNT(*) FROM follows)::int follows,(SELECT COUNT(*) FROM wallet_ledger)::int wallet")).rows[0];assert.deepEqual(after,before,"viewing a profile must not create product resources");
  const blocked=await mutate(`/api/users/${ownerHandle}/block`,viewer,"PUT",{});assert.equal(blocked.status,200);assert.equal((await blocked.json()).blocked,true);
  assert.equal((await fetch(`${base}/api/users/${ownerHandle}/public`,{headers:{cookie:viewer.cookie}}).then(r=>r.json())).profile.blocked,true);
  assert.equal((await mutate(`/api/users/${ownerHandle}/reports`,viewer,"POST",{reason:"spam",details:"Public profile verification fixture"})).status,201);
  assert.equal((await mutate(`/api/users/${ownerHandle}/block`,viewer,"DELETE")).status,200);
  const records=await db.query("SELECT (SELECT COUNT(*) FROM user_profile_reports WHERE reported_user_id=(SELECT id FROM users WHERE handle=$1))::int reports,(SELECT COUNT(*) FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE u.handle=$1)::int blocks",[ownerHandle]);assert.deepEqual(records.rows[0],{reports:1,blocks:0});
  console.log("Public audience profile privacy, routing API, explicit block/report actions, and navigation side-effect safety verified.");
}finally{await db.query("DELETE FROM users WHERE handle=ANY($1::text[])",[[ownerHandle,viewerHandle]]);await db.end();}
