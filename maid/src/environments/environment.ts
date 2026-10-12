// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// http://datingcuri.com
// baseUrl:  http://127.0.0.1:3011
// baseUrl: 'http://localhost',
export const environment = {
  production: false,
  env: 'dev',
  baseUrl: '',
  socketUrl: 'http://localhost:3011',
  s3ImageUrl: 'https://sugrit-bucket-489206260650-eu-west-3-an.s3.eu-west-3.amazonaws.com',
  meridianApiUrl: 'https://meridian-api.com',
  gaMeasurementId: 'G-1QGW8YC0S4',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
