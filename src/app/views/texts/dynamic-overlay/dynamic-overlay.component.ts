import { Component, OnInit, ViewChild } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FormElement, Morphology } from 'src/app/services/lexicon/lexicon.service';

@Component({
  selector: 'app-dynamic-overlay',
  templateUrl: './dynamic-overlay.component.html',
  styleUrls: ['./dynamic-overlay.component.scss']
})
export class DynamicOverlayComponent implements OnInit {

  @ViewChild('op', {static: false}) model: OverlayPanel | undefined;

  formData: FormElement | undefined;

  label: string | undefined;
  language : string | undefined;
  lexicalEntry : string | undefined;
  formId : string | undefined;
  type : string | undefined;
  morphology : Array<Morphology> | undefined = [];
  constructor() { }

  ngOnInit(): void {
    
  }

  toggleOverlayPanel(evt : any){
    console.log(evt, this.formData);

    if(this.formData){

      this.morphology = [];

      this.label = this.formData.lexicalEntryLabel;
      this.language = this.formData.language;
      this.formId = this.formData.form;
      this.type = this.formData.type;
      this.lexicalEntry = this.formData.lexicalEntry;

      if(this.formData.inheritedMorphology.length > 0){
        this.formData.inheritedMorphology.forEach(el=>{
          if(el.trait=='partOfSpeech'){
            let value = el.value.split('#')[1];
            this.morphology?.push({trait : el.trait, value : value})
          }
        })
      }
      
      if(this.formData.morphology.length > 0){
        this.formData.morphology.forEach(el=>{
          let trait = el.trait.split('#')[1];
          let value = el.value.split('#')[1];
  
          if(trait != '' && value != ''){
            this.morphology?.push({trait: trait, value : value})
          }
        })
      }
      
      
    }
    setTimeout(() => {
      this.model?.show(evt);
    }, 100);
  }

}
