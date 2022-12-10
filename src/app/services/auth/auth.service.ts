import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private client_id = environment.keycloak.client_id;
  private client_secret = environment.keycloak.client_secret;
  private username = environment.keycloak.username;
  private password = environment.keycloak.password;
  private grant_type = environment.keycloak.grant_type;
  private token_endpoint = environment.keycloak.token_endpoint;

  constructor(private http: HttpClient) { }

  getAccessToken(){
    const body = new HttpParams({
      fromObject: {
        client_id: this.client_id,
        client_secret: this.client_secret,
        username: this.username,
        password: this.password,
        grant_type: this.grant_type
      }
    });
    const headers = new HttpHeaders(
      {
        Accept: 'application/json',
        'Content-Type': `application/x-www-form-urlencoded`
      }
    );
    return this.http.post<{access_token : string}>(this.token_endpoint, body, {headers: headers}).pipe(
      map((data)=> data.access_token),
      catchError(err => {
        console.log('Error');
        throw new Error(err)
      }),
      shareReplay()
    )
  }

 
}
