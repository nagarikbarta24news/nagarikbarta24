import { getFacebookAppId } from "./facebook-config.functions";

type FBSdk = {
  init: (opts: { appId: string; version: string; xfbml?: boolean }) => void;
  ui: (
    params: {
      method: "share";
      href: string;
      quote?: string;
      hashtag?: string;
      mobile_iframe?: boolean;
    },
    cb?: (resp: unknown) => void,
  ) => void;
};

declare global {
  interface Window {
    FB?: FBSdk;
    fbAsyncInit?: () => void;
  }
}

let sdkPromise: Promise<FBSdk | null> | null = null;

export function loadFacebookSDK(): Promise<FBSdk | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.FB) return Promise.resolve(window.FB);
  if (sdkPromise) return sdkPromise;

  sdkPromise = (async () => {
    const { appId } = await getFacebookAppId();
    if (!appId) return null;

    return new Promise<typeof window.FB | null>((resolve) => {
      window.fbAsyncInit = () => {
        window.FB?.init({ appId, version: "v20.0", xfbml: false });
        resolve(window.FB ?? null);
      };
      const existing = document.getElementById("facebook-jssdk");
      if (existing) {
        // wait for existing script to init
        const wait = setInterval(() => {
          if (window.FB) {
            clearInterval(wait);
            resolve(window.FB);
          }
        }, 50);
        return;
      }
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(s);
    });
  })();

  return sdkPromise;
}

export async function shareOnFacebook(url: string, quote?: string): Promise<boolean> {
  const FB = await loadFacebookSDK();
  if (!FB) return false;
  return new Promise((resolve) => {
    FB.ui(
      {
        method: "share",
        href: url,
        quote,
        mobile_iframe: true,
      },
      (resp) => {
        resolve(!!resp && !(resp as { error_message?: string }).error_message);
      },
    );
  });
}
