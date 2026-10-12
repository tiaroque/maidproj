import {
  max,
  maxLength,
  min,
  readonly,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { ChatStore } from '../services/admin/signals/store';
import {
  Area,
  Availability,
  MAX_RATE,
  MIN_RATE,
  ServiceKey,
} from '../services/admin/interfaces/service-catalog';
import { invalidAgeError } from '../validators/ageValidator';
import { invalidDateError } from '../validators/dateValidator';
import { invalidDateFormatError } from '../validators/dateValidatorFormat';

export interface PlaceModel {
  country: string;
  location: string;
  locationName: string;
}

export interface ProfileDetailsModel extends PlaceModel {
  profileName: string;
  experienceYears: number | null;
}

export interface ProfileWorkModel {
  services: ServiceKey[];
  hourlyRate: number | null;
  availability: Availability;
  areasCovered: Area[];
}

export interface ProfileAboutModel {
  languages: string[];
  description: string;
}

export interface ProfileFormModel {
  gender: string;
  details: ProfileDetailsModel;
  birthDate: string;
  work: ProfileWorkModel;
  about: ProfileAboutModel;
}

export interface SignupConditionsModel {
  marketing: boolean;
  shareData: boolean;
  agreeTermsConditions: boolean;
}

export function defaultProfileForm(): ProfileFormModel {
  return {
    gender: '',
    details: {
      profileName: '',
      country: '',
      location: '',
      locationName: '',
      experienceYears: null,
    },
    birthDate: '',
    work: {
      services: [],
      hourlyRate: null,
      availability: { days: [], slots: [] },
      areasCovered: [],
    },
    about: {
      languages: [],
      description: '',
    },
  };
}

export function defaultSignupConditions(): SignupConditionsModel {
  return {
    marketing: false,
    shareData: false,
    agreeTermsConditions: false,
  };
}

export function profileFormSchema(storeChat: InstanceType<typeof ChatStore>) {
  return schema<ProfileFormModel>((p) => {
    required(p.gender);
    required(p.details.profileName);
    maxLength(p.details.profileName, 35);
    required(p.details.country);
    required(p.details.location);
    maxLength(p.details.location, 80);
    min(p.details.experienceYears, 0);
    max(p.details.experienceYears, 60);
    required(p.birthDate);
    maxLength(p.birthDate, 10);
    min(p.work.hourlyRate, MIN_RATE);
    max(p.work.hourlyRate, MAX_RATE);
    maxLength(p.about.description, 500);

    readonly(p.details.location, {
      when: ({ valueOf }) => !valueOf(p.details.country),
    });

    validate(p.details.location, ({ value }) => {
      const location = value();
      if (!location) {
        return undefined;
      }
      return location.startsWith('/')
        ? undefined
        : { kind: 'incorrect' as const };
    });

    validate(p.birthDate, ({ value }) => invalidDateFormatError(value()));
    validate(p.birthDate, ({ value }) => invalidDateError(value()));
    validate(p.birthDate, ({ value }) => invalidAgeError(value()));
  });
}

export const signupConditionsSchema = schema<SignupConditionsModel>((p) => {
  validate(p.agreeTermsConditions, ({ value }) =>
    value() === true ? undefined : { kind: 'required' as const },
  );
});
