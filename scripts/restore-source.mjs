import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { brotliDecompressSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const encodedPath = join(root, "site-source.tar.br.b64");
const archivePath = join(root, ".site-source.tar.br");
const tarPath = join(root, ".site-source.tar");

const encoded = readFileSync(encodedPath, "utf8").replace(/\s+/g, "");
writeFileSync(archivePath, Buffer.from(encoded, "base64"));
writeFileSync(tarPath, brotliDecompressSync(readFileSync(archivePath)));
execFileSync("tar", ["-xf", tarPath, "-C", root], { stdio: "inherit" });
unlinkSync(archivePath);
unlinkSync(tarPath);
