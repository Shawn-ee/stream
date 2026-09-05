import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export const identityDocumentLimitBytes = 8 * 1024 * 1024;
export type IdentityDocumentType = "passport" | "national_id" | "driver_license";

export class IdentityDocumentUploadError extends Error {
  constructor(public code: "unsupported_identity_document" | "identity_document_too_large" | "identity_document_storage_unavailable") { super(code); }
}

function safeStoragePath(storagePath: string, storageReference: string) {
  if (!/^[0-9a-f-]{36}-[0-9a-f-]{36}\.idoc$/i.test(storageReference))
    throw new IdentityDocumentUploadError("identity_document_storage_unavailable");
  const root = resolve(storagePath);
  const path = resolve(root, storageReference);
  if (!path.startsWith(root + sep))
    throw new IdentityDocumentUploadError("identity_document_storage_unavailable");
  return path;
}

function sniff(buffer: Buffer): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (buffer.subarray(0,5).toString() === "%PDF-") return "application/pdf";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  return null;
}

function keyFrom(value: string): Buffer {
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new IdentityDocumentUploadError("identity_document_storage_unavailable");
  return decoded;
}

export async function saveIdentityDocument(options: { storagePath:string; encryptionKey:string; userId:string; buffer:Buffer }) {
  if (!options.buffer.length || options.buffer.length > identityDocumentLimitBytes) throw new IdentityDocumentUploadError("identity_document_too_large");
  const mimeType = sniff(options.buffer);
  if (!mimeType) throw new IdentityDocumentUploadError("unsupported_identity_document");
  const root = resolve(options.storagePath); await mkdir(root,{recursive:true});
  const reference = `${options.userId}-${randomUUID()}.idoc`;
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",keyFrom(options.encryptionKey),iv);
  const encrypted=Buffer.concat([cipher.update(options.buffer),cipher.final()]);
  await writeFile(resolve(root,reference),Buffer.concat([iv,cipher.getAuthTag(),encrypted]),{flag:"wx",mode:0o600});
  return { storageReference:reference,mimeType,fileSize:options.buffer.length,checksum:createHash("sha256").update(options.buffer).digest("hex") };
}

export async function readIdentityDocument(options:{storagePath:string;encryptionKey:string;storageReference:string}) {
  const path=safeStoragePath(options.storagePath,options.storageReference);
  const value=await readFile(path); if(value.length<29) throw new IdentityDocumentUploadError("identity_document_storage_unavailable");
  const decipher=createDecipheriv("aes-256-gcm",keyFrom(options.encryptionKey),value.subarray(0,12));
  decipher.setAuthTag(value.subarray(12,28)); return Buffer.concat([decipher.update(value.subarray(28)),decipher.final()]);
}

export async function removeIdentityDocument(storagePath:string,storageReference:string) {
  const path=safeStoragePath(storagePath,storageReference);
  await unlink(path).catch((error:NodeJS.ErrnoException)=>{
    if(error.code!=="ENOENT") throw new IdentityDocumentUploadError("identity_document_storage_unavailable");
  });
}

export async function verifyIdentityDocumentStorage(storagePath:string) {
  const root=resolve(storagePath);
  const probe=resolve(root,`.storage-probe-${randomUUID()}`);
  try {
    await mkdir(root,{recursive:true});
    await writeFile(probe,randomBytes(16),{flag:"wx",mode:0o600});
    await unlink(probe);
  } catch {
    await unlink(probe).catch(()=>undefined);
    throw new IdentityDocumentUploadError("identity_document_storage_unavailable");
  }
}
