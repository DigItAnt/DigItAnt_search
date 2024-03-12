import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Form, FormGroup } from '@angular/forms';
import { BehaviorSubject, concatAll, forkJoin, lastValueFrom, map, Observable, of, shareReplay, switchMap, tap, withLatestFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LexicalElement, LexiconService } from '../lexicon/lexicon.service';
import { AnnotationsRows, GetFilesResponse, TextMetadata, TextsService } from '../text/text.service';


const lexiconFields = [
  'lexicalEntryText', 'lexicalEntryType', 'lexicalEntryPos',
  'lexicalEntryAuthor', 'lexicalEntryLanguage', 'lexicalEntryStatus',
  'formText', 'formAuthor', 'lexicalElementLabel', 'lexicalElementIRI'
];

const lexicalEntryFields = [
  'lexicalEntryText', 'lexicalEntryType', 'lexicalEntryPos',
  'lexicalEntryAuthor', 'lexicalEntryLanguage', 'lexicalEntryStatus'
];

const formFields = [
  'formText', 'formAuthor'
];

const lexicalElementFields = [
  'lexicalElementLabel', 'lexicalElementIRI'
];

const inscriptionFields = [
  'word', 'wordSearchMode', 'title', 'id',
  'language', 'alphabet', 'dateOfOriginNotBefore', 'dateOfOriginNotAfter', 'modernName',
  'inscriptionType', 'objectType', 'material', 'ductus', 'wordDivisionType'
];

const bibliographyFields = [
  'bibliographyTitle',
  'bibliographyID',
  'bibliographyDate',
  'bibliographyAuthor'
];

@Injectable({
  providedIn: 'root'
})

export class AdvancedsearchService {
  
  private lexoUrl = environment.lexoUrl;
  private cashUrl = environment.cashUrl;
  private zoteroUrl = environment.zoteroUrl;


  private attestationsSubject = new BehaviorSubject<TextMetadata[]>([]);
  private filteredResults : TextMetadata[] = [];
  attestations$: Observable<TextMetadata[]> = this.attestationsSubject.asObservable();

  constructor(private http : HttpClient,
              private lexiconService : LexiconService,
              private inscriptionService : TextsService,
  ) { }


  crossQuery(formValues: any, advancedSearchForm : FormGroup): Observable<any> {

    const lexiconSearch = this.filterLexicon(formValues, advancedSearchForm);
    const inscriptionSearch = this.filterInscription(formValues, advancedSearchForm)
    const bibliographySearch = this.filterBibliography(formValues, advancedSearchForm);

    return forkJoin([lexiconSearch, inscriptionSearch, bibliographySearch]).pipe(
      switchMap(([lexiconSearch, inscriptionSearch, bibliographySearch]) => {
        
        //se lexiconSearch/bibliography non è vuoto, allora prendi gli IRI
        //e attaccali alla catena CQL ed effettua una nuova ricerca
        //con i dati presi da LexO e/o Zotero e i valori del formValues
        let lexiconCQL : string[] = [];
        let bibliographyCQL : string[] = [];
        let inscriptionCQL : string[] = [];

        if(lexiconSearch.length > 0 || bibliographySearch.length > 0){

          if(lexiconSearch && typeof lexiconSearch != 'string' && lexiconSearch.length > 0){

            lexiconCQL = this.CQLLexiconBuilder(lexiconSearch);
          }else if(typeof lexiconSearch == 'string'){
            const check = lexiconSearch.split('_').pop();
            if(check == 'entry'){
              lexiconCQL.push(`attestation.lexicalEntry=="${lexiconSearch}"`)
            }else if(check == 'form'){
              lexiconCQL.push(`attestation="${lexiconSearch}"`)
            }
          }

          if(bibliographySearch && bibliographySearch.length > 0){
            bibliographyCQL = this.CQLBibliographyBuilder(bibliographySearch)
          }

          inscriptionCQL = this.CQLInscriptionBuilder(formValues, advancedSearchForm);


          const combineQueries = (lexiconCQL: string[], bibliographyCQL: string[], inscriptionCQL: string[]): string => {
            let allQueries: string[] = [];
            
            if (lexiconCQL.length > 0) {
              allQueries.push(`(${lexiconCQL.join('|')})`);
            }
          
            if (bibliographyCQL.length > 0) {
              allQueries.push(`(${bibliographyCQL.join('|')})`);
            }
          
            if (inscriptionCQL.length > 0) {
              allQueries.push(`(${inscriptionCQL.join(' & ')})`);
            }
          
            const query = allQueries.length > 0 ? `[${allQueries.join(' & ')}]` : '';
            return query;
          };

          const finalQuery = combineQueries(lexiconCQL, bibliographyCQL, inscriptionCQL);

          const headers = new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded'
          });
          
          let params = new HttpParams()
            .set('query', finalQuery)
            .set('offset','0')
            .set('limit', '5000');


            return this.http.post<GetFilesResponse>(this.cashUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
              map(res => res.files),
              map(texts => this.inscriptionService.mapData(texts)),
              tap(res => this.filteredResults = res),
              shareReplay(),
            );
        }else{
          return of(inscriptionSearch);
        }
      }),
      tap(res => console.log(res))
    )
  }

  filterInscription(formValues : any, advancedSearchForm : FormGroup){

    let queryParts: string[] = [];

    const shouldCallCash = inscriptionFields.some(field => {
      const control = advancedSearchForm.get(field);
      return control && control.touched && (control.value !== null || control.value !== '');
    });

    const shouldCallLexO = lexiconFields.some(field => {
      const control = advancedSearchForm.get(field);
      return control && control.touched && (control.value !== null || control.value !== '');
    });

    console.log(shouldCallCash)

    if(shouldCallCash && !shouldCallLexO){

      queryParts = this.CQLInscriptionBuilder(formValues, advancedSearchForm);
      const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';      

      if(query != ''){

        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded'
        });
        
        let params = new HttpParams()
          .set('query', query)
          .set('offset', '0')
          .set('limit', '1000');
        


          return this.http.post<GetFilesResponse>(this.cashUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
            map(res => res.files),
            map(texts => this.inscriptionService.mapData(texts)),
            tap(res => this.filteredResults = res),
            shareReplay(),
          );
      }else{
        return of([])
      }
    }else{
      return of([])
    }
  }

  filterLexicon(formValues : any, advancedSearchForm : FormGroup){

    const shouldCallLexO = lexiconFields.some(field => 
      (formValues[field] !== null) && advancedSearchForm.get(field)?.touched
    );

    if(shouldCallLexO){
      const shouldQueryLexicalEntries = lexicalEntryFields.some(field => {
        const control = advancedSearchForm.get(field);
        return control && control.touched && (control.value !== null && control.value !== '');
      }
      
      );
    
      // Verifica se i campi per le forme sono stati compilati
      const shouldQueryForms = formFields.some(field => {
        const control = advancedSearchForm.get(field);
        return control && control.touched && (control.value !== null || control.value !== '');
      });

      const shouldQueryLexicalElement = lexicalElementFields.some(field => {
        const control = advancedSearchForm.get(field);
        return control && control.touched && (control.value !== null || control.value !== '');
      });


      if (shouldQueryLexicalEntries) {
        const payload = {
          text: formValues.lexicalEntryText ? formValues.lexicalEntryText : '',
          searchMode: formValues.lexicalEntrySearchMode,
          type: formValues.lexicalEntryType ? formValues.lexicalEntryType : '',
          pos: formValues.lexicalEntryPos ? formValues.lexicalEntryPos : '',
          formType: "entry",
          author: formValues.lexicalEntryAuthor ? formValues.lexicalEntryAuthor : '',
          lang: formValues.lexicalEntryLanguage ? formValues.lexicalEntryLanguage : '',
          status: formValues.lexicalEntryStatus ? formValues.lexicalEntryStatus : '',
          offset: 0,
          limit: 500
        };

        return this.lexiconService.getLexicalEntryList(payload)
      }else if(shouldQueryForms){

        const payload = {
            text: formValues.formText ? formValues.formText : '',
            searchMode: formValues.formSearchMode,
            representationType: "writtenRep",
            author: formValues.formAuthor ? formValues : '',
            offset: 0,
            limit: 500
          
        };
        
        return this.lexiconService.getFormsListAdvanced(payload)

      }else if(shouldQueryLexicalElement){

        return(of(formValues.lexicalElementIRI))
      }else{
        return of([])
      }

    }else{
      return(of([]))
    }

  }

  filterBibliography(formValues : any, advancedSearchForm : FormGroup){
    // Verifica se dovresti fare la chiamata
    const shouldCallZotero = bibliographyFields.some(field => 
      formValues[field] !== null && advancedSearchForm.get(field)?.touched
    );

    if (shouldCallZotero) {
      // Costruisce la query
      if (!formValues.bibliographyAuthor && !formValues.bibliographyDate && !formValues.bibliographyTitle && !formValues.bibliographyID) {
        return of([]);
      }
      let filters = [];

      if (formValues.bibliographyAuthor) {
        filters.push({
          "key": "author",
          "value": `.*${formValues.bibliographyAuthor}.*`,
          "op": "re"
        });
      }
    
      if (formValues.bibliographyDate) {
        
        let start, end;
        let singleDate;
        //è un range
        if(Array.isArray(formValues.bibliographyDate)){
          start = formValues.bibliographyDate[0].getFullYear().toString();
          end = formValues.bibliographyDate[1].getFullYear().toString();

          filters.push({
            "key": "date",
            "value": `${start}`,
            "op": "gt"
          });

          filters.push({
            "key": "date",
            "value": `${end}`,
            "op": "lt"
          });


        }else{
          singleDate = formValues.bibliographyDate.getFullYear().toString();

          filters.push({
            "key": "date",
            "value": `${singleDate}`,
            "op": "gt"
          });
        }

        
      }
    
      if (formValues.bibliographyTitle) {
        filters.push({
          "key": "title",
          "value": `.*${formValues.bibliographyTitle}.*`,
          "op": "re"
        });
      }
    
      if (formValues.bibliographyID) {
        filters.push({
          "key": "id",
          "value": `.*${formValues.bibliographyID}.*`,
          "op": "re"
        });
      }
    
      let body = {
        "requestUUID": "11",
        "filters": filters,
        "user-id": "11"
      };
      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      let defaultOffset = '';
      let defaultLimit = '';
      defaultOffset = '0';
      defaultLimit = '5000';
      let params = new HttpParams();  
      params = params.set('offset', defaultOffset);
      params = params.set('limit', defaultLimit);

      const options = {
        params: params
      };
      
      return this.http.post<any>(this.cashUrl + "api/public/searchbiblio", body, options).pipe(
        map(res => res.results),
        map((books:any[]) => books.map(book => ({
          abstractNote : book.params['Abstract Note']?.join('; ') || '',
          author: book.params['Author']?.join('; ') || '',
          date: book.params['Date']?.join('; ') || '',
          editor : book.params['Editor']?.join('; ') || '',
          isbn: book.params['ISBN']?.join('; ') || '',
          itemType: book.params['Item Type']?.join('; ') || '',
          key: book.params['Key']?.join('; ') || '',  
          pages: book.params['Pages']?.join('; ') || '',
          place: book.params['Place']?.join('; ') || '',
          publicationYear : book.params['Publication Year']?.join('; ') || '',
          publisher : book.params['Publisher']?.join('; ') || '',
          title: book.params['Title']?.join('; ') || '',
          url : book.params['Url']?.join('; ') || '',
          volume: book.params['Volume']?.join('; ') || '',
        }))),
      )
    } else {
      return of([]);
    }
    
  }

  CQLLexiconBuilder(lexiconResults : any[]){
    let queryParts: string[] = [];
    let isLexicalEntry : boolean = false;
    lexiconResults.forEach(element => {
      
      if(element.lexicalEntry && !element.form){
        isLexicalEntry = true;
        queryParts.push(`${element.lexicalEntry}`)
      }else if(element.form){
        isLexicalEntry = false;
        queryParts.push(`${element.form}`)
      }
    });

    if(isLexicalEntry){
      return [`attestation.lexicalEntry=="${queryParts.join('|')}"`];

    }else{
      return [`attestation="${queryParts.join('|')}"`];

    }
  }

  CQLInscriptionBuilder(formValues : any, advancedSearchForm : FormGroup){
    let queryParts: string[] = [];

    queryParts.push(`_doc.itAnt_ID=".*"`)
    if (advancedSearchForm.get('word')?.touched && formValues.word) {
      switch(formValues.wordSearchMode){
        case 'startsWith' : queryParts.push(` word="${formValues.word}.*"`); break;
        case 'contains' : queryParts.push(` word=".*${formValues.word}.*"`); break;
        case 'endsWith' : queryParts.push(` word=".*${formValues.word}"`); break;
        case 'equals' : queryParts.push(` word=="${formValues.word}"`); break;
      }
    }

    if (advancedSearchForm.get('title')?.touched && formValues.title) {
      queryParts.push(`_doc.title=="${formValues.title}"`);
    }

    if (advancedSearchForm.get('id')?.touched && formValues.id) {
      queryParts.push(`_doc.itAnt_ID=="${formValues.id}.*"`);
    }

    if (advancedSearchForm.get('otherId')?.touched && formValues.otherId) {
      queryParts.push(`_doc.traditionalIDs.traditionalID=="${formValues.otherId}"`);
    }

    if (advancedSearchForm.get('language')?.touched && formValues.language) {
      queryParts.push(`_doc.language.ident=="${formValues.language}"`);
    }

    if (advancedSearchForm.get('alphabet')?.touched && formValues.alphabet) {
      queryParts.push(`_doc.alphabet=="${formValues.alphabet}"`);
    }

    if (advancedSearchForm.get('dateOfOriginNotBefore')?.touched && formValues.dateOfOriginNotBefore) {
      queryParts.push(`_doc.dateOfOriginNotBefore >="${formValues.dateOfOriginNotBefore}"`);
    }

    if (advancedSearchForm.get('dateOfOriginNotAfter')?.touched && formValues.dateOfOriginNotAfter) {
      queryParts.push(`_doc.dateOfOriginNotAfter <="${formValues.dateOfOriginNotAfter}"`);
    }

    if (advancedSearchForm.get('modernName')?.touched && formValues.modernName) {
      queryParts.push(`_doc.originalPlace.modernNameUrl=="${formValues.modernName}"`);
    }

    if (advancedSearchForm.get('inscriptionType')?.touched && formValues.inscriptionType) {
      queryParts.push(`_doc.inscriptionType=="${formValues.inscriptionType}"`);
    }

    if (advancedSearchForm.get('objectType')?.touched && formValues.objectType) {
      queryParts.push(`_doc.support.objectType=="${formValues.objectType}"`);
    }

    if (advancedSearchForm.get('material')?.touched && formValues.material) {
      queryParts.push(`_doc.support.material=="${formValues.material}"`);
    }

    if (advancedSearchForm.get('ductus')?.touched && formValues.ductus) {
      queryParts.push(`_doc.bodytextpart.ductus=="${formValues.ductus}"`);
    }

    if (advancedSearchForm.get('wordDivisionType')?.touched && formValues.wordDivisionType) {
      queryParts.push(`_doc.wordDivisionType=="${formValues.wordDivisionType}"`);
    }

    return queryParts;
  }

  CQLBibliographyBuilder(bibliographyResults : any[]){
    let queryParts: string[] = [];

    bibliographyResults.forEach(element=>{
      queryParts.push(`${element.key}`);
    })
    return [`attestation.bibliography.key=="${queryParts.join('|')}"`];
  }

  restoreFilterAttestations(){
    this.filteredResults = [];
    this.attestationsSubject.next([])
  }

  getFilteredResults(){
    return this.filteredResults;
  }

  /* sliceFilteredAttestations(pageIndex: number, pageSize: number): Observable<TextMetadata[]> {
    return this.attestations$.pipe(
      switchMap(attestations => {
        if(attestations && attestations.length > 0) {
          return of(attestations.slice(pageIndex, pageSize));
        } else {
          return this.inscriptionService.texts$.pipe(
            map(allAttestations => allAttestations.slice(pageIndex , pageSize))
          );
        }
      })
    );
  } */

}
