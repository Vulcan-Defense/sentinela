type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        ux_mode?: "popup" | "redirect";
        callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => GoogleTokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let loader: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Não foi possível carregar o Google.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o Google."));
    document.head.appendChild(script);
  });
  return loader;
}

export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentity();
  const api = window.google?.accounts.oauth2;
  if (!api) throw new Error("Google Identity Services indisponível.");
  return new Promise((resolve, reject) => {
    const client = api.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || "Login com Google cancelado."));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: error => {
        reject(new Error(error.message || "Não foi possível abrir o login do Google."));
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}
