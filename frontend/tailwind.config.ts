import type { Config } from 'tailwindcss'

const config: Config = {
  // Tailwind가 스캔할 파일 경로
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
