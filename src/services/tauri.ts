// Tauri 桥接层：动态导入，保证 Web 预览也能构建运行

export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let cachedLabel: string | null = null

/** 同步获取窗口 label（widget / main），非 Tauri 环境返回 'main' */
export function getWindowLabel(): string {
  if (cachedLabel !== null) return cachedLabel
  cachedLabel = 'main'
  return 'main'
}

export async function initWindowLabel(): Promise<string> {
  if (!isTauri) {
    cachedLabel = 'main'
    return 'main'
  }
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    cachedLabel = getCurrentWindow().label
  } catch {
    cachedLabel = 'main'
  }
  return cachedLabel
}

export async function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T | undefined> {
  if (!isTauri) return undefined
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<T>(cmd, args)
  } catch {
    return undefined
  }
}

export async function startDragging(): Promise<void> {
  if (!isTauri) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
  } catch {
    /* ignore */
  }
}

export async function setWidgetSize(w: number, h: number): Promise<void> {
  // 通过 Rust 命令定向操作 widget 窗口（不是当前窗口）
  await tauriInvoke('set_widget_size', { w: w, h: h })
}

export async function setWidgetOnTop(onTop: boolean): Promise<void> {
  // 通过 Rust 命令定向操作 widget 窗口
  await tauriInvoke('set_widget_on_top', { onTop })
}

export async function tauriListen(
  event: string,
  cb: (payload: string) => void
): Promise<(() => void) | undefined> {
  if (!isTauri) return undefined
  try {
    const { listen } = await import('@tauri-apps/api/event')
    const un = await listen<string>(event, (e) => cb(e.payload))
    return () => un()
  } catch {
    return undefined
  }
}

export async function autostartEnable(on: boolean): Promise<void> {
  if (!isTauri) return
  try {
    const m = await import('@tauri-apps/plugin-autostart')
    if (on) await m.enable()
    else await m.disable()
  } catch {
    /* ignore */
  }
}

export async function autostartIsEnabled(): Promise<boolean> {
  if (!isTauri) return false
  try {
    const m = await import('@tauri-apps/plugin-autostart')
    return await m.isEnabled()
  } catch {
    return false
  }
}
