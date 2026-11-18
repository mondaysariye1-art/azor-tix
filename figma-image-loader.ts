'use client'

import type { ImageLoaderProps } from 'next/image'
import { figmaNextImageLoader } from '@payloadcms/figma/next-image-loader'

const PAYLOAD_FILE_PATH_PATTERN = /^\/(?!\/)(?:.+\/)?api\/[^/]+\/file\/.+$/

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const [pathname = '', search = ''] = src.split('?')

  if (PAYLOAD_FILE_PATH_PATTERN.test(pathname)) {
    return figmaNextImageLoader({ src, width, quality })
  }

  if (src.startsWith('data:') || pathname.endsWith('.svg')) {
    return src
  }

  const params = new URLSearchParams(search)
  params.set('w', String(width))
  if (quality !== undefined) {
    params.set('q', String(quality))
  }

  return `${pathname}?${params.toString()}`
}
