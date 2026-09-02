import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { IdentityDocumentUploadError, readIdentityDocument, saveIdentityDocument } from "../src/identity-document-storage.js";
const key=Buffer.from("local-identity-document-key-32!!").toString("base64");
test("identity documents are magic-byte validated and encrypted at rest",async()=>{const path=await mkdtemp(join(tmpdir(),"holiwyn-idoc-"));try{const pdf=Buffer.from("%PDF-1.7\nprivate test document");const stored=await saveIdentityDocument({storagePath:path,encryptionKey:key,userId:"00000000-0000-4000-8000-000000000001",buffer:pdf});assert.equal(stored.mimeType,"application/pdf");const disk=await readFile(join(path,stored.storageReference));assert.equal(disk.includes(pdf),false);assert.deepEqual(await readIdentityDocument({storagePath:path,encryptionKey:key,storageReference:stored.storageReference}),pdf);}finally{await rm(path,{recursive:true,force:true});}});
test("unsupported content is rejected regardless of filename metadata",async()=>{const path=await mkdtemp(join(tmpdir(),"holiwyn-idoc-"));try{await assert.rejects(()=>saveIdentityDocument({storagePath:path,encryptionKey:key,userId:"00000000-0000-4000-8000-000000000001",buffer:Buffer.from("not an image")}),error=>error instanceof IdentityDocumentUploadError&&error.code==="unsupported_identity_document");}finally{await rm(path,{recursive:true,force:true});}});
