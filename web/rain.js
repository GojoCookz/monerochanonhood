const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const canvas = document.createElement('canvas')
canvas.className = 'monero-rain'
canvas.setAttribute('aria-hidden', 'true')
document.body.prepend(canvas)
const ctx = canvas.getContext('2d')
let width=0, height=0, frame=0, previous=0
const drops=Array.from({length:18},()=>({x:Math.random(),y:Math.random(),angle:Math.random()*Math.PI*2,size:8+Math.random()*9,speed:12+Math.random()*18,spin:(Math.random()-.5)*.6}))
function resize(){width=innerWidth;height=innerHeight;canvas.width=width;canvas.height=height}
function draw(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now
  ctx.clearRect(0,0,width,height)
  for(const d of drops){
    d.y+=d.speed*dt/height;d.angle+=d.spin*dt
    if(d.y>1.05)d.y=-.05
    ctx.save();ctx.translate(d.x*width+Math.sin(d.angle)*12,d.y*height);ctx.rotate(d.angle)
    ctx.fillStyle='#ff8524';ctx.beginPath();ctx.arc(0,0,d.size,0,Math.PI*2);ctx.fill()
    ctx.strokeStyle='#fff0dc';ctx.lineWidth=d.size*.22;ctx.lineJoin='miter'
    ctx.beginPath();ctx.moveTo(-d.size*.65,d.size*.45);ctx.lineTo(-d.size*.65,-d.size*.32);ctx.lineTo(0,d.size*.25);ctx.lineTo(d.size*.65,-d.size*.32);ctx.lineTo(d.size*.65,d.size*.45);ctx.stroke();ctx.restore()
  }
  frame=requestAnimationFrame(draw)
}
function sync(){cancelAnimationFrame(frame);canvas.hidden=reduced.matches||document.hidden;if(!canvas.hidden){previous=performance.now();frame=requestAnimationFrame(draw)}}
addEventListener('resize',resize);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);resize();sync()
