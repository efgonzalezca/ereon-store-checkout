export interface Env {
  apiUrl: string;
}

export function parseEnv(source: { VITE_API_URL?: string }): Env {
  const raw = source.VITE_API_URL?.trim();
  if (!raw) {
    throw new Error('VITE_API_URL is required');
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('VITE_API_URL must be a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_URL must use http or https');
  }

  return { apiUrl: raw.replace(/\/+$/, '') };
}
