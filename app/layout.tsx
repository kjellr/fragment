import type { Metadata } from 'next'
import { DM_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-mono',
})

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Fragment — Shader Studio',
  description: 'Transform any input into generative shader art',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmMono.variable} ${instrumentSerif.variable} h-full`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  )
}
