import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BlockedUsers,
  UserDetailsObject,
  UserModel,
  UserType,
} from './admin/interfaces/user.interface';

export const userTypes: UserType[] = ['Cleaner', 'Client'];
export const USER_TYPE_VALUES: string[] = userTypes;

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);


  getTest() {
    const url = `${environment.baseUrl}/api/users/test`;
    return this.http.get(url, {
      withCredentials: true,
    });
  }

  saveContactUsMessage(name: string, email: string, message: string) {
    const url = `${environment.baseUrl}/api/contact/saveMessage`;
    return this.http.post<any>(
      url,
      { name, email, message },
      {
        withCredentials: true,
      },
    );
  }

  getDetailsOtherUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    const url = `${environment.baseUrl}/api/users/userDetails`;
    return this.http.get<UserDetailsObject>(url, {
      params,
      withCredentials: true,
    });
  }

  getDetailsOtherUserHome(userId: string) {
    const params = new HttpParams().set('userId', userId);
    const url = `${environment.baseUrl}/api/users/userDetailsHome`;
    return this.http.get<UserDetailsObject>(url, {
      params,
      withCredentials: true,
    });
  }

  // getDetailsAll() {
  //   const url = `${environment.baseUrl}/api/xprofile/detailsAll`;
  //   return this.http.get<any>(url, { withCredentials: true });
  //   // .pipe(delay(3000));
  // }

  deleteOffer(offer: string) {
    const url = `${environment.baseUrl}/api/xprofile/offer`;
    const params = new HttpParams().set('offer', offer);
    return this.http.delete<any>(url, {
      params,
      withCredentials: true,
    });
  }

  // // // // // // // // // Filters // // // // // // // // //// // //
  getGroupedOffers(userType: string, offer: string): Observable<UserModel[]> {
    const url = `${environment.baseUrl}/api/users/offerSearch`;
    const params = new HttpParams()
      .set('userType', userType)
      .set('offer', offer);
    return this.http.get<UserModel[]>(url, {
      params,
      withCredentials: true,
    });
  }

  getLatestOffers(userType: string) {
    const url = `${environment.baseUrl}/api/users/latestOffers`;
    const params = new HttpParams().set('userType', userType);
    return this.http.get<any>(url, {
      params,
      withCredentials: true,
    });
  }

  // getDetails() {
  //   const url = `${environment.baseUrl}/api/xprofile/details`;
  //   return this.http.get<any>(url, { withCredentials: true });
  //   // .pipe(delay(3000));
  // }

  // getMeasures() {
  //   const url = `${environment.baseUrl}/api/xprofile/measurements`;
  //   return this.http.get<any>(url, { withCredentials: true });
  //   // .pipe(delay(2000));
  // }

  // getAdditionals() {
  //   const url = `${environment.baseUrl}/api/xprofile/additional`;
  //   return this.http.get<any>(url, { withCredentials: true });
  //   // .pipe(delay(5000));
  // }

  createSignUp(form: any) {
    const url = `${environment.baseUrl}/api/users/signup`;
    return this.http.post<any>(url, form, {
      withCredentials: true,
    });
  }

  createProfileDetails(form: any) {
    const url = `${environment.baseUrl}/api/xprofile/details`;
    return this.http.post<any>(url, form, {
      withCredentials: true,
    });
  }

  createDateOfBirth(birthday: any) {
    const url = `${environment.baseUrl}/api/xprofile/birthdate`;
    return this.http.post<any>(
      url,
      { birthday },
      {
        withCredentials: true,
      },
    );
  }

  createProfileWork(form: any) {
    const url = `${environment.baseUrl}/api/xprofile/work`;
    return this.http.post<any>(url, form, {
      withCredentials: true,
    });
  }

  createProfileAbout(form: any) {
    const url = `${environment.baseUrl}/api/xprofile/about`;
    return this.http.post<any>(url, form, {
      withCredentials: true,
    });
  }

  createDreamOffer(offerDream: string) {
    const url = `${environment.baseUrl}/api/xprofile/offer`;
    return this.http.post<any>(
      url,
      { offer: offerDream },
      {
        withCredentials: true,
      },
    );
  }

  setProfilePic(form: any) {
    const url = `${environment.baseUrl}/api/images/setProfilePic`;
    return this.http.post<any>(url, form, {
      withCredentials: true,
    });
  }

  setAvatar(avatar: string) {
    const url = `${environment.baseUrl}/api/images/setAvatar`;
    return this.http.post<void>(
      url,
      { avatar },
      {
        withCredentials: true,
      },
    );
  }

  blockUser(userId: string) {
    const url = `${environment.baseUrl}/api/users/block-user`;
    return this.http.post<any>(
      url,
      { userToBlock: userId },
      {
        withCredentials: true,
      },
    );
  }

  getBlockedUsers() {
    const url = `${environment.baseUrl}/api/users/get-blocked-users`;
    return this.http.get<BlockedUsers[]>(url, {
      withCredentials: true,
    });
  }

  setChatAlertsDisabled(disabled: boolean) {
    const url = `${environment.baseUrl}/api/users/chat-alerts`;
    return this.http.post<{ chatAlertsDisabled: boolean }>(
      url,
      { disabled },
      {
        withCredentials: true,
      },
    );
  }

  unblockUser(uid: string) {
    const url = `${environment.baseUrl}/api/users/unblock-user`;
    return this.http.post(
      url,
      { user: uid },
      {
        withCredentials: true,
      },
    );
  }

}

// export interface XForm {
//   locations: {
//     location: string;
//     nationality: string;
//   };
//   birthDate: {
//     month: number;
//     day: number;
//     year: number;
//   };
//   measurements: {
//     height: number;
//     weight: number;
//     // bust: [90],
//   };
//   aditional: {
//     eyes: string;
//     languages: string[];
//   };
// }
