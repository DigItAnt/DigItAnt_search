import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'urlDecoder'
})
export class UrlDecoderPipe implements PipeTransform {

  transform(uri: string): string {
    return decodeURI(uri);
  }

}
