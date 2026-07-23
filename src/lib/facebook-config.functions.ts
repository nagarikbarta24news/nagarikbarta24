import { createServerFn } from "@tanstack/react-start";

export const getFacebookAppId = createServerFn({ method: "GET" }).handler(async () => {
  return { appId: process.env.FACEBOOK_APP_ID ?? "" };
});
