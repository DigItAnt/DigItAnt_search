// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  cash_baseUrl : '/cash/',

  lexo_baseUrl : '/LexO-backend-itant/service/',
  lexo_key: "PRINitant19",

  keycloak: {
    // Url of the Identity Provider
    issuer: 'https://lari2.ilc.cnr.it/auth/',

    // Realm
    realm: 'princnr',

    // The SPA's id. 
    // The SPA is registerd with this id at the auth-serverß
    client_id: 'princlient',

    client_secret: '23f0dcbf-5a45-4401-b4d4-1634c844cf71',

    username: 'demo_fruitore',
    password: 'demo_fruitore',
    grant_type: 'password',

    token_endpoint: 'https://lari2.ilc.cnr.it/auth/realms/princnr/protocol/openid-connect/token'
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
