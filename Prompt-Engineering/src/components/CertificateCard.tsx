import { Download } from 'lucide-react'
import { LogoMark } from './Logo'
import { Button } from './Button'

interface Props {
  name: string
  score: number
}

function drawAndDownload(name: string, score: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#221D1A'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // logo mark
  const ox = canvas.width / 2 - 30
  const oy = 90
  const scale = 0.6
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#F2A93B'
  ctx.beginPath()
  ctx.arc(25, 25, 17, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#E31C5F'
  ctx.beginPath()
  ctx.moveTo(68, 4)
  ctx.lineTo(84, 4)
  ctx.lineTo(36, 96)
  ctx.lineTo(20, 96)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#22A67A'
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(56, 58, 40, 38, 5)
    ctx.fill()
  } else {
    ctx.fillRect(56, 58, 40, 38)
  }
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#F2A93B'
  ctx.font = '700 20px "Space Grotesk", sans-serif'
  ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 220)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 48px "Space Grotesk", sans-serif'
  ctx.fillText(name, canvas.width / 2, 320)

  ctx.fillStyle = '#c9beb2'
  ctx.font = '400 20px "IBM Plex Sans", sans-serif'
  ctx.fillText('has completed Zawadie PromptClass', canvas.width / 2, 370)
  ctx.fillText('Prompt Engineering for Zawadie Agents', canvas.width / 2, 400)

  ctx.fillStyle = '#E31C5F'
  ctx.font = '700 18px "IBM Plex Sans", sans-serif'
  ctx.fillText(`Total score: ${score}%`, canvas.width / 2, 460)

  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `zawadie-promptclass-certificate-${name.replace(/\s+/g, '-').toLowerCase()}.png`
  a.click()
}

export function CertificateCard({ name, score }: Props) {
  return (
    <div className="rounded-panel bg-[#221D1A] p-10 text-center text-white">
      <LogoMark size={44} className="mx-auto mb-4" />
      <div className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-warn">
        Certificate of completion
      </div>
      <div className="mb-2.5 font-display text-[26px] font-bold">{name}</div>
      <div className="mb-6 text-sm text-[#c9beb2]">
        has completed Zawadie PromptClass — Prompt Engineering for Zawadie Agents
        <br />
        Total score: {score}%
      </div>
      <Button onClick={() => drawAndDownload(name, score)}>
        <Download className="h-4 w-4" /> Download certificate
      </Button>
    </div>
  )
}
