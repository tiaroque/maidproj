import config from "../endpoints.config";

const FACEBOOK_GRAPH_VERSION = "v21.0";
const FACEBOOK_SCOPES = ["email", "public_profile"];

export type FacebookProfile = {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
};

const assertFacebookConfig = () => {
  if (!config.facebookAppId) {
    throw new Error("FACEBOOK_APP_ID is missing");
  }
  if (!config.facebookAppSecret) {
    throw new Error("FACEBOOK_APP_SECRET is missing");
  }
};

export const buildFacebookAuthUrl = (state: string) => {
  assertFacebookConfig();
  const params = new URLSearchParams({
    client_id: config.facebookAppId,
    redirect_uri: config.facebookRedirectUri,
    state,
    response_type: "code",
    scope: FACEBOOK_SCOPES.join(","),
    // Facebook never re-prompts for a declined permission unless asked to.
    auth_type: "rerequest",
  });
  return `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
};

export const getFacebookProfile = async (
  code: string,
): Promise<FacebookProfile> => {
  assertFacebookConfig();
  const tokenParams = new URLSearchParams({
    client_id: config.facebookAppId,
    client_secret: config.facebookAppSecret,
    redirect_uri: config.facebookRedirectUri,
    code,
  });
  const tokenRes = await fetch(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token?${tokenParams.toString()}`,
  );
  if (!tokenRes.ok) {
    throw new Error(`Facebook token exchange failed: ${tokenRes.status}`);
  }
  const { access_token: accessToken } = (await tokenRes.json()) as {
    access_token?: string;
  };
  if (!accessToken) {
    throw new Error("Facebook token exchange returned no access token");
  }

  const profileParams = new URLSearchParams({
    fields: "id,name,email,picture.type(large)",
    access_token: accessToken,
  });
  const profileRes = await fetch(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me?${profileParams.toString()}`,
  );
  if (!profileRes.ok) {
    throw new Error(`Facebook profile fetch failed: ${profileRes.status}`);
  }
  return (await profileRes.json()) as FacebookProfile;
};
