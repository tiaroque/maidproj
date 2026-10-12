import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileImage } from './interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private httpClient = inject(HttpClient);


  uploadFile(
    file: File,
    width: number,
    height: number,
  ): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();
    formData.append('file', file);
    formData.set('width', width.toString());
    formData.set('height', height.toString());

    const url = `${environment.baseUrl}/api/images/upload`;

    const request = new HttpRequest('POST', url, formData, {
      reportProgress: true,
      responseType: 'json',
      withCredentials: true,
    });

    return this.httpClient.request(request);
  }

  uploadChatPhoto(
    file: File,
    conversationId: string,
    messageId: string,
    width: number,
    height: number,
  ): Observable<HttpEvent<any>> {
    const url = `${environment.baseUrl}/api/images/uploadChatImages`;
    const formData: FormData = new FormData();

    formData.append('file', file);
    formData.append('conversationId', conversationId);
    formData.append('messageId', messageId);
    formData.set('width', width.toString());
    formData.set('height', height.toString());

    const request = new HttpRequest('POST', url, formData, {
      reportProgress: true,
      responseType: 'json',
      withCredentials: true,
    });

    return this.httpClient.request(request);
  }

  deleteFile(key: string): Observable<any> {
    const encodedKey = encodeURIComponent(key);
    const url = `${environment.baseUrl}/api/images/image/${encodedKey}`;
    return this.httpClient.delete(url, { withCredentials: true });
  }

  // getFiles(): Observable<ProfileImage[]> {
  //   const url = `${environment.baseUrl}/api/images/files`;
  //   return this.httpClient.get<ProfileImage[]>(url);
  // }
}
