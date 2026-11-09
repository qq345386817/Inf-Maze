// Run after deploying. The default is a dry run; --submit sends changed canonical URLs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://inf-maze.luopeike.com';
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--submit')) throw new Error('Usage: node scripts/notify-indexnow.mjs [--submit]');
const {keyFile}=JSON.parse(fs.readFileSync(path.join(root,'content/search-indexing.json'),'utf8'));
if(!/^[a-f0-9]{32}\.txt$/.test(keyFile)) throw new Error('Invalid IndexNow key filename');
const key=fs.readFileSync(path.join(root,keyFile),'utf8').trim();
if(key!==keyFile.slice(0,-4)) throw new Error('IndexNow key does not match filename');
const stateFile=path.join(root,'.wrangler/indexnow-state.json');
const previous=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{pages:{}};
const urls=[...fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
if(urls.length!==36||new Set(urls).size!==36) throw new Error('Expected 36 unique canonical sitemap URLs');
const pages={};
for(const url of urls){
  const parsed=new URL(url);
  if(parsed.origin!==origin||parsed.search||parsed.hash) throw new Error('Unexpected sitemap URL');
  const relative=parsed.pathname==='/'?'index.html':parsed.pathname.endsWith('/')?`${parsed.pathname.slice(1)}index.html`:`${parsed.pathname.slice(1)}.html`;
  const local=fs.readFileSync(path.join(root,relative));
  if(!local.toString().includes(`<link rel="canonical" href="${url}">`)) throw new Error('Page canonical does not match sitemap');
  pages[url]=createHash('sha256').update(local).digest('hex');
}
const urlList=urls.filter(url=>previous.pages[url]!==pages[url]);
console.log(`${args.includes('--submit')?'Submit':'Dry run'}: ${urlList.length} changed canonical URLs out of ${urls.length}.`);
if(!urlList.length||!args.includes('--submit')) process.exit(0);

// curl respects the workstation's network proxy; never invoke a shell with the payload.
function curl(args){
  const result=spawnSync('curl',['--silent','--show-error','--compressed','--connect-timeout','10','--max-time','45',...args],{encoding:'utf8'});
  if(result.status!==0) throw new Error(`IndexNow network request failed: ${result.stderr.trim()}`);
  return result.stdout;
}
const keyLocation=`${origin}/${keyFile}`;
const verification=curl(['--fail',keyLocation]);
if(verification.trim()!==key) throw new Error('Deploy and verify the public IndexNow key before submitting');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'infmaze-indexnow-'));
try{
  const payloadFile=path.join(temp,'payload.json');
  const responseFile=path.join(temp,'response.txt');
  fs.writeFileSync(payloadFile,JSON.stringify({host:new URL(origin).host,key,keyLocation,urlList}));
  const status=curl(['--header','Content-Type: application/json; charset=utf-8','--data-binary',`@${payloadFile}`,'--output',responseFile,'--write-out','%{http_code}','https://api.indexnow.org/indexnow']).trim();
  if(!['200','202'].includes(status)) throw new Error(`IndexNow returned HTTP ${status}: ${fs.readFileSync(responseFile,'utf8').slice(0,500)}`);
  fs.mkdirSync(path.dirname(stateFile),{recursive:true});
  fs.writeFileSync(stateFile,JSON.stringify({submittedAt:new Date().toISOString(),status,pages},null,2)+'\n');
  console.log(`IndexNow HTTP ${status}: ${urlList.length} URLs received${status==='202'?'; key validation pending':''}. This does not confirm indexing.`);
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
