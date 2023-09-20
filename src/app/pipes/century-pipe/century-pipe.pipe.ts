import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'centuryPipe'
})
export class CenturyPipe implements PipeTransform {

  transform(century: number): string {
    
    let beforeOrAfter : string = century < 0 ? 'BC' : 'AD';
    let absCentury : string = (Math.abs(century)/100).toString();
    switch(absCentury){
      case '0' : absCentury = 1+"st"; break;
      case '1': absCentury = absCentury+"st";break;
      case '2': absCentury = absCentury+"nd";break;
      case '3': absCentury = absCentury+"rd";break;
      default: absCentury = absCentury+"th"; break;
    }
    return absCentury + ' century ' + beforeOrAfter;
  }

}
