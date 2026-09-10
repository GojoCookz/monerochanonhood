import sharp from 'sharp'
const source='assets/monerochan-sections-raw.png'
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2]
  const excess=Math.min(r,b)-g
  if(excess>65 && r>100 && b>100)data[i+3]=0
  else if(excess>30 && r>90 && b>90){
    const alpha=Math.max(0,1-(excess-30)/35)
    data[i+3]=Math.round(255*alpha)
    data[i+2]=Math.min(b,g+45)
  }
}
const names=['guardian','presenter','inspector']
for(let n=0;n<3;n++){
  const left=Math.round(n*info.width/3),right=Math.round((n+1)*info.width/3)
  const path='assets/monerochan-'+names[n]+'.webp'
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}})
    .extract({left,top:0,width:right-left,height:info.height})
    .resize({width:480}).webp({quality:90}).toFile(path)
  console.log('Saved',path)
}
