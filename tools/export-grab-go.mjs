import sharp from 'sharp'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

const briefs=JSON.parse(await fs.readFile('tools/grab-go-briefs.json','utf8'))
await fs.mkdir('shots',{recursive:true})
const manifest=[]
const seen=new Set()
const tiles=[]
for(let i=0;i<briefs.length;i++){
  const {file}=briefs[i]
  const source=`assets/pack-raw/${file}.png`
  const bytes=await fs.readFile(source)
  const hash=crypto.createHash('sha256').update(bytes).digest('hex')
  if(seen.has(hash))throw new Error('Duplicate source image: '+file)
  seen.add(hash)
  const width=i===0?500:i===1?1500:1080
  const height=i<2?500:1080
  const output=`grab and go/${file}.png`
  await sharp(bytes).resize(width,height,{fit:'cover',position:'centre'}).png({compressionLevel:9}).toFile(output)
  const meta=await sharp(output).metadata()
  if(meta.width!==width||meta.height!==height)throw new Error('Wrong dimensions: '+output)
  const stat=await fs.stat(output)
  manifest.push({file:file+'.png',width,height,bytes:stat.size,source,sourceSha256:hash})
  const image=await sharp(output).resize(300,300,{fit:'contain',background:'#101012'}).png().toBuffer()
  const label=Buffer.from(`<svg width="300" height="34"><rect width="300" height="34" fill="#101012"/><text x="10" y="22" fill="#ffb06a" font-family="sans-serif" font-size="13">${file}</text></svg>`)
  const tile=await sharp({create:{width:300,height:334,channels:3,background:'#101012'}}).composite([{input:image,top:0,left:0},{input:label,top:300,left:0}]).png().toBuffer()
  tiles.push({input:tile,top:Math.floor(i/5)*334,left:(i%5)*300})
  console.log(`VERIFIED ${file}.png ${width}x${height} ${(stat.size/1024).toFixed(0)} KB`)
}
await sharp({create:{width:1500,height:668,channels:3,background:'#101012'}}).composite(tiles).jpeg({quality:92}).toFile('shots/grab-and-go-preview.jpg')
await fs.writeFile('grab and go/manifest.json',JSON.stringify(manifest,null,2))
console.log('PASS: 10 unique generated images, exact dimensions, contact sheet and manifest saved')
