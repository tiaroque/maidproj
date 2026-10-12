import { environment } from '../../environments/environment';

export const isAppApi = (url: string) =>
  url.startsWith('/api') ||
  (!!environment.baseUrl && url.startsWith(`${environment.baseUrl}/api`));

export const isApiRequest = (url: string) => {
  if (isAppApi(url)) {
    return true;
  }

  try {
    return new URL(url).pathname.startsWith('/api');
  } catch {
    return false;
  }
};
