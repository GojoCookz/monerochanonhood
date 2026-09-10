import sharp from 'sharp'
const source='grab and go/01-x-profile-500.png'
for(const [file,size] of [['monerochan-favicon.png',32],['monerochan-touch-icon.png',180]]){
  await sharp(source).resize(size,size).png().toFile('assets/'+file)
  const meta=await sharp('assets/'+file).metadata()
  if(meta.width!==size||meta.height!==size)throw new Error('Incorrect icon dimensions')
  console.log(`Verified ${file}: ${size}x${size}`)
}
