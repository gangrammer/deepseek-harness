/** Locale strings for the ui-bg settings card. */
export const en = {
  title: 'Background',
  subtitle: 'Pick a color, a remote URL, or upload a local image. Applied independently to the whole window and the welcome screen.',
  frameLabel: 'Window background',
  heroLabel: 'Welcome screen background',
  sourceNone: 'Default (theme color)',
  sourceColor: 'Color',
  sourceUrl: 'Remote URL',
  sourceFile: 'Upload local file',
  urlPlaceholder: 'https://example.com/wallpaper.jpg',
  colorPlaceholder: '#1f2933',
  fileHint: 'Click to pick an image (PNG/JPG/GIF/SVG, ≤ 4 MB)',
  clear: 'Clear',
  errorTooLarge: 'File is too large (max 4 MB).',
  errorBadType: 'Only PNG, JPG, GIF and SVG files are supported.',
  errorBadColor: 'Color must be #rgb, #rrggbb or #rrggbbaa.',
  errorBadUrl: 'URL must start with http:// or https://.',
}

export const zh = {
  title: '背景',
  subtitle: '可选颜色、远程图片链接，或上传本地图片。整体窗口和欢迎页背景可分别配置。',
  frameLabel: '窗口背景',
  heroLabel: '欢迎页背景',
  sourceNone: '默认（主题色）',
  sourceColor: '颜色',
  sourceUrl: '远程链接',
  sourceFile: '上传本地文件',
  urlPlaceholder: 'https://example.com/wallpaper.jpg',
  colorPlaceholder: '#1f2933',
  fileHint: '点击选择图片（PNG/JPG/GIF/SVG，≤ 4 MB）',
  clear: '清除',
  errorTooLarge: '文件过大（最大 4 MB）。',
  errorBadType: '仅支持 PNG、JPG、GIF、SVG 格式。',
  errorBadColor: '颜色格式应为 #rgb、#rrggbb 或 #rrggbbaa。',
  errorBadUrl: '链接必须以 http:// 或 https:// 开头。',
}

export type BgKey = keyof typeof en
