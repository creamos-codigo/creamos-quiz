import './globals.css'
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'

// Configure the Poppins font
const poppins = Poppins({
  weight: ['400', '600', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Creamos Quiz Game',
  description: 'A multiplayer trivia game about our creative agency.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Creamos Quiz Game',
    description: 'A multiplayer trivia game about our creative agency.',
    images: [{ url: '/images/creamos_open-graph-image.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creamos Quiz Game',
    description: 'A multiplayer trivia game about our creative agency.',
    images: ['/images/creamos_open-graph-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}