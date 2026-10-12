import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/** Only blurred thumbnails are public; they are rendered for anonymous visitors and indexed. */
const PUBLIC_PREFIX = 'pictures-blured/';

export function s3Url(key: string | undefined | null): string {
  if (!key) {
    return '';
  }
  const path = key.split('/').map(encodeURIComponent).join('/');
  return key.startsWith(PUBLIC_PREFIX)
    ? `${environment.s3ImageUrl}/${path}`
    : `${environment.baseUrl}/api/media/${path}`;
}

@Pipe({ name: 's3Url' })
export class S3UrlPipe implements PipeTransform {
  transform(key: string | undefined | null): string {
    return s3Url(key);
  }
}
