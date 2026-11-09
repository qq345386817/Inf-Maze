// Publish only the explicit site surface, never repository files or source data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.public');
const locales=['','ar','de-DE','es-ES','fr-FR','ja','ko','zh-Hans','zh-Hant'];
const files=new Set(['404.html','_headers','_redirects','robots.txt','sitemap.xml','google8bdd3bd447b6e703.html','google8bdd3bd447b6e703.txt']);
const {keyFile}=JSON.parse(fs.readFileSync(path.join(root,'content/search-indexing.json'),'utf8'));
if(!/^[a-f0-9]{32}\.txt$/.test(keyFile)||fs.readFileSync(path.join(root,keyFile),'utf8').trim()!==keyFile.slice(0,-4)) throw new Error('Invalid IndexNow verification file');
files.add(keyFile);
for(const locale of locales) for(const page of ['index.html','help.html','support.html','privacy-policy.html']) files.add(path.posix.join(locale,page));
for(const file of [...files].filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const [,url] of html.matchAll(/(?:src|href|data-gameplay-src)="(\/(?:style|script|images|favicon)\/[^"?#]+)"/g)) files.add(url.slice(1));
}
// Keep legacy favicon resources referenced by the unchanged policy/manifest.
for(const file of fs.readdirSync(path.join(root,'favicon'))) if(/\.(png|ico|webmanifest)$/.test(file)) files.add('favicon/'+file);
for(const file of files){
  if(file.includes('..')||path.isAbsolute(file)) throw new Error('Invalid publish path '+file);
  if(!fs.statSync(path.join(root,file)).isFile()) throw new Error('Missing publish asset '+file);
}
fs.rmSync(output,{recursive:true,force:true});
const manifest=[];
for(const file of [...files].sort()){
  const bytes=fs.readFileSync(path.join(root,file));
  fs.mkdirSync(path.dirname(path.join(output,file)),{recursive:true});
  fs.writeFileSync(path.join(output,file),bytes);
  manifest.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
fs.mkdirSync(path.join(root,'.wrangler'),{recursive:true});
fs.writeFileSync(path.join(root,'.wrangler/publish-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Packaged ${manifest.length} public files (${manifest.reduce((n,f)=>n+f.bytes,0)} bytes); source and Git data excluded.`);
