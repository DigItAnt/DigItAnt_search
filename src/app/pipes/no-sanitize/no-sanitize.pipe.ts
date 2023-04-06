import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'noSanitize' })
export class NoSanitizePipe implements PipeTransform {
    constructor(private domSanitizer: DomSanitizer) { }

    transform(html: string | null): SafeHtml {
        if (html != null) {
            return this.domSanitizer.bypassSecurityTrustHtml(html);
        }else{
            return this.domSanitizer.bypassSecurityTrustHtml('no')
        }
    }
}