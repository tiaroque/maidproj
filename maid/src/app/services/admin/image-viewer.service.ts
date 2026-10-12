import { Injectable, signal, WritableSignal } from '@angular/core';
import { ImageObj, Photo, ProfileImage } from './interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class ImageViewerService {
  public readonly showViewer = signal<{ index: number }>({ index: -1 });
  public readonly listPhotos = signal<Photo[] | ProfileImage[] | ImageObj[]>(
    [],
  );
}
