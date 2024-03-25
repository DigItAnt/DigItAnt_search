import { Component, OnInit, ViewChild } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import {
  FormElement,
  Morphology,
} from 'src/app/services/lexicon/lexicon.service';

@Component({
  selector: 'app-dynamic-overlay',
  templateUrl: './dynamic-overlay.component.html',
  styleUrls: ['./dynamic-overlay.component.scss'],
})
export class DynamicOverlayComponent implements OnInit {
  @ViewChild('op', { static: false }) model: OverlayPanel | undefined;

  formData: FormElement | undefined;

  label: string | undefined;
  language: string | undefined;
  lexicalEntry: string | undefined;
  formId: string | undefined;
  type: string | undefined;
  morphology: Array<Morphology> | undefined = [];
  constructor() {}

  ngOnInit(): void {}

  // Definisce una funzione per attivare o disattivare un pannello sovrapposto.
  toggleOverlayPanel(evt: any) {
    // Stampa in console l'evento e i dati del formulario corrente.
    console.log(evt, this.formData);

    // Controlla se esistono dati nel formulario.
    if (this.formData) {
      // Reinizializza l'array della morfologia.
      this.morphology = [];

      // Assegna i valori relativi all'elemento lessicale dal formulario ai corrispondenti attributi dell'oggetto.
      this.label = this.formData.lexicalEntryLabel;
      this.language = this.formData.language;
      this.formId = this.formData.form;
      this.type = this.formData.type;
      this.lexicalEntry = this.formData.lexicalEntry;

      // Verifica se ci sono morfologie ereditate con lunghezza maggiore di 0.
      if (this.formData.inheritedMorphology.length > 0) {
        // Itera sugli elementi delle morfologie ereditate.
        this.formData.inheritedMorphology.forEach((el) => {
          // Se il tratto è 'partOfSpeech', elabora il valore e lo aggiunge all'array della morfologia.
          if (el.trait == 'partOfSpeech') {
            let value = el.value.split('#')[1];
            this.morphology?.push({ trait: el.trait, value: value });
          }
        });
      }

      // Verifica se ci sono morfologie con lunghezza maggiore di 0.
      if (this.formData.morphology.length > 0) {
        // Itera sugli elementi delle morfologie.
        this.formData.morphology.forEach((el) => {
          let trait = el.trait.split('#')[1];
          let value = el.value.split('#')[1];

          // Se sia il tratto che il valore non sono vuoti, li aggiunge all'array della morfologia.
          if (trait != '' && value != '') {
            this.morphology?.push({ trait: trait, value: value });
          }
        });
      }
    }
    // Imposta un timeout per mostrare il modello relativo al pannello, ritardato di 100 millisecondi.
    setTimeout(() => {
      this.model?.show(evt);
    }, 100);
  }
}
