import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'noSanitize' })
export class NoSanitizePipe implements PipeTransform {
  constructor(private domSanitizer: DomSanitizer) {}

  // Definizione della funzione transform che accetta un parametro di tipo string o null
  transform(html: string | null): SafeHtml {
    // Verifica se il parametro html non è nullo
    if (html != null) {
      // Nel caso in cui html non sia nullo, utilizza il metodo bypassSecurityTrustHtml dell'oggetto domSanitizer
      // per marcare l'html come sicuro, bypassando così le misure di sicurezza del DOM e restituisce il risultato.
      return this.domSanitizer.bypassSecurityTrustHtml(html);
    } else {
      // Nel caso in cui il parametro html sia nullo, restituisce una stringa 'no' marcata come sicura
      // utilizzando lo stesso metodo bypassSecurityTrustHtml.
      return this.domSanitizer.bypassSecurityTrustHtml('no');
    }
  }
}
