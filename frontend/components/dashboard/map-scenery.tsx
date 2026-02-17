'use client'

import { useEffect, useState } from 'react'

type WeatherType = 'sunny' | 'rain' | 'rainbow' | 'snow'

interface MapSceneryProps {
  weather?: WeatherType
  showAnimated?: boolean
}

export function MapScenery({ weather = 'sunny', showAnimated = true }: MapSceneryProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            weather === 'sunny'
              ? 'linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 100%)'
              : weather === 'rain'
              ? 'linear-gradient(to bottom, #808080 0%, #A9A9A9 100%)'
              : weather === 'snow'
              ? 'linear-gradient(to bottom, #B0C4DE 0%, #E6F0FF 100%)'
              : 'linear-gradient(to bottom, #87CEEB 0%, #FFB6C1 100%)',
        }}
      />

      {weather === 'sunny' && <div className="animate-sun-fade absolute top-12 right-16 h-20 w-20 rounded-full bg-yellow-300 shadow-lg shadow-yellow-400/50" />}
      {weather === 'rain' && <div className="animate-moon-glow absolute top-16 right-20 h-16 w-16 rounded-full bg-gray-100 opacity-60" />}

      <div className="absolute top-12 left-0 h-full w-full">
        {[0, 1, 2, 3].map((i) => (
          <div key={`cloud-${i}`} className="animate-cloud-drift absolute" style={{ top: `${20 + i * 30}%`, animationDelay: `${i * 5}s`, animationDuration: `${20 + i * 4}s` }}>
            <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
              <path d="M 20 35 Q 10 30 10 20 Q 10 10 20 8 Q 25 2 35 5 Q 45 0 55 8 Q 70 5 75 20 Q 85 15 95 20 Q 100 25 95 35 Z" fill="white" opacity={weather === 'rain' ? '0.4' : '0.7'} />
            </svg>
          </div>
        ))}
      </div>

      {weather === 'sunny' && (
        <div className="absolute top-20 left-0 h-full w-full">
          {[0, 1, 2].map((i) => (
            <div key={`bird-${i}`} className="animate-bird-fly absolute" style={{ left: `${10 + i * 25}%`, top: `${15 + i * 15}%`, animationDelay: `${i * 2}s` }}>
              <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                <path d="M 5 10 Q 10 5 15 10 Q 10 15 5 10" stroke="#333" strokeWidth="2" fill="none" />
                <path d="M 15 10 Q 20 5 25 10 Q 20 15 15 10" stroke="#333" strokeWidth="2" fill="none" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {weather === 'rain' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div key={`rain-${i}`} className="animate-rain-fall absolute w-1 h-8 bg-gradient-to-b from-blue-300 to-transparent rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 50}%`, animationDelay: `${Math.random() * 0.8}s`, opacity: 0.6 }} />
          ))}
        </div>
      )}

      {weather === 'snow' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(40)].map((_, i) => (
            <div key={`snow-${i}`} className="animate-snowflake-fall absolute" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <circle cx="10" cy="10" r="2" opacity="0.9" />
                {[0, 60, 120].map((angle) => (
                  <line key={`arm-${angle}`} x1="10" y1="10" x2="10" y2="2" stroke="white" strokeWidth="1" opacity="0.8" transform={`rotate(${angle} 10 10)`} />
                ))}
              </svg>
            </div>
          ))}
        </div>
      )}

      {weather === 'rainbow' && (
        <div className="animate-rainbow-glow absolute left-1/2 top-1/3 -translate-x-1/2 pointer-events-none">
          <svg width="300" height="150" viewBox="0 0 300 150" fill="none">
            <path d="M 50 150 A 100 100 0 0 1 250 150" stroke="#FF0000" strokeWidth="12" opacity="0.7" />
            <path d="M 60 150 A 95 95 0 0 1 240 150" stroke="#FF7F00" strokeWidth="12" opacity="0.7" />
            <path d="M 70 150 A 90 90 0 0 1 230 150" stroke="#FFFF00" strokeWidth="12" opacity="0.7" />
            <path d="M 80 150 A 85 85 0 0 1 220 150" stroke="#00FF00" strokeWidth="12" opacity="0.7" />
            <path d="M 90 150 A 80 80 0 0 1 210 150" stroke="#0000FF" strokeWidth="12" opacity="0.7" />
            <path d="M 100 150 A 75 75 0 0 1 200 150" stroke="#4B0082" strokeWidth="12" opacity="0.7" />
            <path d="M 110 150 A 70 70 0 0 1 190 150" stroke="#9400D3" strokeWidth="12" opacity="0.7" />
          </svg>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-green-600/20 via-green-500/10 to-transparent" />

      <div className="absolute bottom-20 left-0 right-0 flex justify-around px-8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={`flower-${i}`} className="animate-flower-sway" style={{ animationDelay: `${i * 0.3}s` }}>
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
              <circle cx="12" cy="8" r="3" fill="#FF69B4" />
              <circle cx="12" cy="8" r="2.5" fill="#FF1493" />
              <path d="M 12 8 L 12 20" stroke="#228B22" strokeWidth="2" />
            </svg>
          </div>
        ))}
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-around px-12 opacity-70">
        {[0, 1, 2, 3].map((i) => (
          <div key={`bush-${i}`} className="animate-bush-rustle" style={{ animationDelay: `${i * 0.4}s` }}>
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
              <ellipse cx="8" cy="14" rx="6" ry="8" fill="#2F7D3F" opacity="0.8" />
              <ellipse cx="16" cy="12" rx="7" ry="9" fill="#3A9653" opacity="0.9" />
              <ellipse cx="24" cy="14" rx="6" ry="8" fill="#2F7D3F" opacity="0.8" />
            </svg>
          </div>
        ))}
      </div>

      <div className="absolute bottom-40 left-0 right-0 h-32 opacity-30">
        <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice">
          <polygon points="0,200 150,80 300,200" fill="#8B7355" />
          <polygon points="200,200 350,60 500,200" fill="#A0826D" />
          <polygon points="400,200 550,90 700,200" fill="#8B7355" />
          <polygon points="600,200 750,70 900,200" fill="#A0826D" />
          <polygon points="800,200 950,100 1100,200" fill="#8B7355" />
        </svg>
      </div>
    </div>
  )
}
