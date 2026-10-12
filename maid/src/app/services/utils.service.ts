import { inject, Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { format, isSameWeek, isSameYear, isToday, isYesterday } from 'date-fns';
import { pt, enGB, fr, de, es, it, nl } from 'date-fns/locale';

import { TranslateService } from '@ngx-translate/core';
import { AlertsGeralComponent } from '../shared/snackbars/alerts-geral/alerts-geral.component';

export { langUrlMatcher } from '../utils/lang-url-matcher';

export interface LocateDatetime {
  mask: string;
  placeholder: string;
  parseFormat: string;
}

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  private snackBar = inject(MatSnackBar);

  translateService = inject(TranslateService);

  alert(
    messageTxt: string,
    buttonTxt: string,
    duration = 3000,
    verticalPostition: MatSnackBarVerticalPosition = 'bottom',
  ) {
    this.snackBar.openFromComponent(AlertsGeralComponent, {
      duration: duration,
      // panelClass: ['unicorn-dark-theme'],
      verticalPosition: verticalPostition,
      data: {
        messageTxt,
        buttonTxt,
      },
    });
  }

  // success(messageTxt: string, buttonTxt: string, duration = 4000) {
  //   this.snackBar.openFromComponent(AlertsGeralComponent, {
  //     duration: duration,
  //     panelClass: ['unicorn-dark-theme'],
  //     data: {
  //       messageTxt,
  //       buttonTxt,
  //     },
  //   });
  // }

  // error(
  //   messageTxt: string,
  //   buttonTxt: string,
  //   duration = 4000,
  //   verticalPostition: MatSnackBarVerticalPosition = 'bottom',
  // ) {
  //   this.snackBar.openFromComponent(AlertsGeralComponent, {
  //     duration: duration,
  //     panelClass: ['unicorn-dark-theme'],
  //     verticalPosition: verticalPostition,
  //     data: {
  //       messageTxt,
  //       buttonTxt,
  //     },
  //   });
  // }

  providerOAuth(message: string, component: any, duration = 4000) {
    this.snackBar.openFromComponent(component, {
      duration: duration,
      panelClass: ['unicorn-dark-theme'],
      data: message,
    });
  }

  inputType(): 'outline' | 'fill' {
    return 'outline';
  }

  preloadImages(imagesLocation: string[]) {
    const links = Array.from<HTMLLinkElement>(
      document.querySelectorAll('link[as=image]'),
    ).map((link) => link.href);

    imagesLocation.forEach((location) => {
      if (!links.includes(location)) {
        const linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'preload');
        linkEl.setAttribute('href', location);
        linkEl.setAttribute('loading', 'eager');
        linkEl.setAttribute('fetchpriority', 'high');
        linkEl.setAttribute('as', 'image');
        document.head.appendChild(linkEl);
      }
    });
  }

  // Static Methods
  // static isDateValid(year: number, month: number, day: number) {
  //   const dateInput = `${year}/${month}/${day}`;
  //   const birthDate = new Date(dateInput);
  //   if (
  //     birthDate.getFullYear() == year &&
  //     birthDate.getMonth() == month - 1 &&
  //     birthDate.getDate() == day
  //   ) {
  //     return true;
  //   }
  //   return false;
  // }

  getLocaleDate(language: string): LocateDatetime {
    // if(language === 'pt') {
    return {
      mask: 'd0/M0/0000',
      parseFormat: 'dd/MM/yyyy',
      placeholder: 'dd/mm/aaaa',
      // }
    };
  }

  manageDateFormat = (date: Date, mode: string) => {
    const lang = this.translateService.currentLang;

    let locale = enGB;

    switch (lang) {
      case 'en':
        locale = enGB;
        break;
      case 'fr':
        locale = fr;
        break;
      case 'de':
        locale = de;
        break;
      case 'it':
        locale = it;
        break;
      case 'pt':
        locale = pt;
        break;
      case 'es':
        locale = es;
        break;
      case 'nl':
        locale = nl;
        break;

      default:
        break;
    }

    const today = this.translateService.instant('today');
    const yesterday = this.translateService.instant('yesterday');

    if (mode === 'weekDays') {
      if (isToday(date)) {
        return today;
      } else if (isYesterday(date)) {
        return yesterday;
      } else if (isSameWeek(new Date(), date)) {
        return format(date, 'EEEE', { locale: locale });
      } else if (isSameYear(new Date(), date)) {
        // msg.groupDaily = format(msgDate, 'PPPP', { locale: pt });
        return format(date, 'EEEE, dd MMM', { locale: locale });
      } else {
        return format(date, 'EEEE, dd MMM yyyy', { locale: locale });
      }
    } else if (mode === 'date') {
      if (isToday(date)) {
        return today;
      } else if (isYesterday(date)) {
        return yesterday;
      } else {
        return format(date, 'dd/MM/yyyy');
      }
    }
  };

  static getDate(year: number, month: number, day: number) {
    const dateInput = `${year}/${month}/${day}`;
    const birthDate = new Date(dateInput);
    return birthDate;
  }

  static _filter(
    colection: any[],
    name: string,
    descriptionNameField = 'name',
  ): any[] {
    const filterValue = name.toLowerCase();
    return colection.filter(
      (option) =>
        option[descriptionNameField].toLowerCase().indexOf(filterValue) === 0,
    );
  }

  static isUserUsingMobile = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    // User agent string method
    let isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    // Screen resolution method
    if (!isMobile) {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      isMobile = screenWidth < 768 || screenHeight < 768;
    }

    // Touch events method
    if (!isMobile) {
      isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // CSS media queries method
    if (!isMobile) {
      const bodyElement = document.getElementsByTagName('body')[0];
      isMobile =
        window
          .getComputedStyle(bodyElement)
          .getPropertyValue('content')
          .indexOf('mobile') !== -1;
    }

    return isMobile;
  };

  static sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static ObjectId = (
    m = Math,
    d = Date,
    h = 16,
    s = (s: any) => m.floor(s).toString(h),
  ) => s(d.now() / 1000) + ' '.repeat(h).replace(/./g, () => s(m.random() * h));

  static getBrowserName(): string {
    const agent = window.navigator.userAgent.toLowerCase();
    const browser =
      agent.indexOf('edge') > -1
        ? 'Microsoft Edge'
        : agent.indexOf('edg') > -1
          ? 'Chromium-based Edge'
          : agent.indexOf('opr') > -1
            ? 'Opera'
            : agent.indexOf('chrome') > -1
              ? 'Chrome'
              : agent.indexOf('trident') > -1
                ? 'Internet Explorer'
                : agent.indexOf('firefox') > -1
                  ? 'Firefox'
                  : agent.indexOf('safari') > -1
                    ? 'Safari'
                    : 'other';

    return browser;
  }

  // linkAuthProvider(
  //   provider: string,
  //   component: ComponentType<any>,
  //   duration = 60000
  // ) {
  //   return this.snackBar.openFromComponent(component, {
  //     duration: duration,
  //     panelClass: ['yellow-snackbar'],
  //     data: provider,
  //   });
  // }
}
