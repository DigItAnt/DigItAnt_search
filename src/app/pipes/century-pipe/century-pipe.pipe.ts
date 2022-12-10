import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'centuryPipe'
})
export class CenturyPipePipe implements PipeTransform {

  transform(century: number): string {
    
    let beforeOrAfter : string = century < 0 ? 'BC' : 'AD';
    let absCentury : string = (Math.abs(century)/100).toString();
    return absCentury + ' century ' + beforeOrAfter;
  }

}
