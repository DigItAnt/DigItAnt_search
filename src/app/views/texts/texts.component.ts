import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AfterViewInit, Component, ComponentRef, ElementRef, NgZone, OnInit, Renderer2, ViewChild, ViewContainerRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import * as L from 'leaflet';
import { circle, tileLayer } from 'leaflet';
import { MenuItem } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import { map, tap, Subject, takeUntil, BehaviorSubject, Observable, switchMap, take, filter, debounceTime, timeout, catchError, iif, throwError, of, EMPTY, shareReplay, mergeMap, flatMap, delay, forkJoin, withLatestFrom } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { FormElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { PopupService } from 'src/app/services/maps/popup/popup.service';
import { AnnotationsRows, Book, BookAuthor, BookEditor, Graphic, ListAndId, TextMetadata, TextsService, TextToken, XmlAndId } from 'src/app/services/text/text.service';
import { environment } from 'src/environments/environment';
import { DynamicOverlayComponent } from './dynamic-overlay/dynamic-overlay.component';
import { buildCustomInterpretative, getApparatus, getBibliography, getCommentaryXml, getFacsimile, getInscriptionType, getTeiChildren, getTranslationByXml, groupAlphabet, groupByCenturies, groupLanguages, groupMaterial, groupObjectTypes, groupTypes, leidenDiplomaticBuilder } from './utils';


export interface CenturiesCounter {
  century: number,
  count: number,
  label: string,
}



export interface LocationsCounter {
  ancientPlaceUrl: string,
  ancientPlaceId: string,
  ancientPlaceLabel: string,
  modernPlaceUrl: string,
  modernPlaceId: string,
  modernPlaceLabel: string,
  count: number,
}

export interface TypesCounter {
  inscriptionType: string,
  count: number,
}

export interface AlphabetCounter {
  alphabet: string,
  count: number,
}

export interface LanguagesCounter {
  language: string,
  count: number,
}

export interface ObjectTypeCounter {
  objectType: string,
  count: number,
}

export interface WordDivisionTypeCounter {
  count: number,
  type: string,
}

export interface MaterialCounter {
  material: string,
  count: number,
}

export interface DuctusCounter {
  ductus: string,
  count: number,
}

export interface TextFilter {
  filter: string;
  date: number;
  place: string;
  type: string;
  file: string;
}

export interface AutoCompleteEvent {
  originalEvent: object,
  query: string,
}

export interface PaginatorEvent {
  page: number,
  first: number,
  rows: number,
  pageCount: number,
}

const allowedCenturies: number[] = [-600, -500, -400, -300, -200, -100, 100];

@Component({
  selector: 'app-texts',
  templateUrl: './texts.component.html',
  styleUrls: ['./texts.component.scss']
})
export class TextsComponent implements OnInit, AfterViewInit {

  //RXJS
  destroy$: Subject<boolean> = new Subject<boolean>();
  autocomplete$: BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({ originalEvent: {}, query: '' });
  autocompleteLocations: Array<LocationsCounter> = [];
  getGeoData: BehaviorSubject<LocationsCounter[]> = new BehaviorSubject<LocationsCounter[]>([]);

  somethingWrong: boolean = false;
  showSpinner: boolean = true;
  isActiveInterval: boolean = false;
  first: number = 0;
  rows: number = 8;
  allowedFilters: string[] = ['date', 'location', 'type', 'search'];
  allowedOperators: string[] = ['filter', 'date', 'place', 'type', 'file'];
  searchOptions: Array<string> = ['start', 'equals', 'contains', 'ends']


  // MAP
  leafletMapOptions: any;
  layers: Array<L.Circle> = [];


  singleMap: L.Map | undefined;
  singleCircle: L.Circle | undefined;
  bounds = new L.LatLngBounds(new L.LatLng(33.802052, 4.239242), new L.LatLng(50.230863, 19.812745));


  

  activeTab: Observable<string | null> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) =>
      Object.keys(queryParams).length === 0 ? null : queryParams as TextFilter
    ),
    map((filter: TextFilter | null) =>
      filter ? filter.filter : null
    ),
    tap(index =>
      index === 'search' ? this.activeIndex = 1 : this.activeIndex = 0
    )
  );

  activeDate: Observable<number> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.date) return filter.date;
      return NaN;
    })
  );

  activeLocation: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.place) return filter.place;
      return '';
    })
  );

  activeType: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.type) return filter.type;
      return '';
    })
  );

  activeFile: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.file) return filter.file;
      return '';
    })
  );

  totalRecords: Observable<number> = this.textService.countFiles().pipe(
    takeUntil(this.destroy$),
  );

  paginationItems: Observable<TextMetadata[]> = this.textService.paginationItems().pipe(
    tap(x=> this.showSpinner = true),
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([])
      )),
    takeUntil(this.destroy$),
    tap((x) => this.showSpinner = false)
  );

  groupCenturies: Observable<CenturiesCounter[]> = this.textService.getUniqueMetadata('_doc__dateOfOriginNotBefore').pipe(
    takeUntil(this.destroy$),
    map(texts => groupByCenturies(texts)),
  )

  
  groupLocations: Observable<LocationsCounter[]> = this.textService.getUniqueMetadata('_doc__originalPlace__modernNameUrl').pipe(
    takeUntil(this.destroy$),
    map(data => data.map((item : any) => {
      const match = item.match(/(\d+)(?="?$)/);
      return match ? match[1] : null;
    }).filter((id : any) => id)),   // Filtra gli eventuali valori null
    map(data => data.map((item : any) => ({ modernPlaceId: item }))),
    tap(x => console.log(x))
  )

   
  groupTypes: Observable<any[]> = this.textService.getUniqueMetadata('_doc__inscriptionType').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(texts => texts.filter((text : any) => text && text.trim() !== '')), // Filtra le stringhe vuot
    map(texts => texts.map((text : any) => ({inscriptionType : text})))
  )

  groupLanguages: Observable<LanguagesCounter[]> = this.textService.getUniqueMetadata('_doc__language__ident').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(texts => texts.filter((text : any) => text && text.trim() !== '' && !text.includes('Ital-x'))),
    map(lang => lang.map((l : any) => ({ language : l.replace(/[\"]/g,'')}))
    ) 
  )

  groupAlphabet: Observable<AlphabetCounter[]> = this.textService.getUniqueMetadata('_doc__alphabet').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(alphabets => alphabets.map((alpha : any) => ({alphabet : alpha}))),
  )

  groupObjectTypes: Observable<ObjectTypeCounter[]> = this.textService.getUniqueMetadata('_doc__support__objectType').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(objectTypes => objectTypes.map((obj : any) => ({objectType : obj.replace(/[\"]/g,'')}))),
  )

  groupMaterial: Observable<MaterialCounter[]> = this.textService.getUniqueMetadata('_doc__support__material').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(materials => materials.map((mat : any) => ({material : mat.replace(/[\"]/g,'')}))),
  ) 


  geoData: Observable<GlobalGeoDataModel[]> = this.groupLocations.pipe(
    
    switchMap(locations => this.mapsService.getGeoPlaceData(locations)),
    delay(1000),
    switchMap(geoData => {
      const searchAttestationsObservables = geoData.map(place => {
        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded'
        });
        const cqlQuery = `[_doc__originalPlace__modernNameUrl="${place.modernUri}"]`;
        let params = new HttpParams()
          .set('query', cqlQuery)
          .set('offset', '0')
          .set('limit', '100');

        return this.http.post<AnnotationsRows>(environment.cashUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
          map(attestations => ({ ...place, attestations }))
        );
      });

      return forkJoin(searchAttestationsObservables);
    }),
    tap(data => this.drawMap(data))
  )

  searchLocations: Observable<any[]> = this.autocomplete$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    withLatestFrom(this.geoData),
    map(([query, r]) => {
      return r.filter(item => item.modernName.includes(query.query))
    })
  )

  getTextPaginationIndexReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  getFileByIdReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  getTextContentReq$: BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getInterpretativeReq$: BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getDiplomaticReq$: BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getTranslationReq$: BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getAnnotationReq$: BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getBibliographyReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFacsimileReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getCommentaryReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getApparatusReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getGetoDataFromFile$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  getInscriptionType$: BehaviorSubject<any> = new BehaviorSubject<any>(null);


  loadingInterpretative: boolean = false;
  loadingDiplomatic: boolean = false;
  loadingTranslation: boolean = false;
  loadingBibliography: boolean = false;
  loadingFacsimile: boolean = false;
  loadingCommentary: boolean = false;
  loadingApparatus: boolean = false;
  loadingPagination : boolean = false;

  displayModal: boolean = false;

  currentElementId: number = NaN;
  currentTokensList: TextToken[] | undefined;
  autopsyAuthors: Array<any> = [];
  seenAuthors: Array<any> = [];
  fileNotAvailable: boolean = false;

  @ViewChild('interpretativeText') interpretativeText!: ElementRef;
  @ViewChild('diplomaticText') diplomaticText!: ElementRef;
  @ViewChild('apparatusText') apparatusText!: ElementRef;
  @ViewChild('dynamicOverlay', { read: ViewContainerRef }) container: ViewContainerRef | undefined;
  arrayDynamicComponents: Array<FormElement> = [];


  isBodyTextPartArray: boolean = false;
  isTraditionalIdArray: boolean = false;
  onlyTextCommentary: string[] = [];
  referencedCommentary: any[] = [];

  getFileById: Observable<TextMetadata> = this.getFileByIdReq$.pipe(
    switchMap(fileId => fileId && fileId != '' ? this.textService.getFileByID(fileId) : of()),
    tap(file => {
      if (file) {
        console.log(file)
        this.onlyTextCommentary = [];
        this.referencedCommentary = [];
        this.tempXml = null;
        this.isVenetic = false;
        this.isOscan = false;
        this.loadingCommentary = true;
        this.loadingInterpretative = true;
        this.loadingTranslation = true;
        this.loadingBibliography = true;
        this.loadingFacsimile = true;
        this.loadingApparatus = true;
        this.getGetoDataFromFile$.next(null)
        this.getGetoDataFromFile$.next(file);
        this.getTextContentReq$.next(file['element-id']);
        this.isBodyTextPartArray = Array.isArray(file.bodytextpart)
        this.isTraditionalIdArray = Array.isArray(file.traditionalIDs)
      }
    })
  )

  code: string = '';

  isVenetic: boolean = false;
  isOscan : boolean = false;
  getXMLContent: Observable<XmlAndId> = this.getTextContentReq$.pipe(
    tap(elementId => !isNaN(elementId) ? this.currentElementId = elementId : of()),
    switchMap(elementId => !isNaN(elementId) ? this.textService.getContent(elementId) : of()),
    tap((res) => {
      if (res.xml != '') {
        //console.log(res.xml);
        this.code = res.xml;

        //controllo se è venetico
        let languageNodes = new DOMParser().parseFromString(this.code, "text/xml").querySelectorAll('language');
        languageNodes.forEach(el => {
          if (el.getAttribute('ident') == 'xve') this.isVenetic = true
          if (el.getAttribute('ident') == 'osc') this.isOscan = true
        })
        this.arrayDynamicComponents = [];
        this.externalReferences = []
        this.getInterpretativeReq$.next(res);
        this.getDiplomaticReq$.next(res);
        this.getTranslationReq$.next(res);
        this.getBibliographyReq$.next(res.xml);
        this.getFacsimileReq$.next(res.xml);
        this.getApparatusReq$.next(res.xml);
        this.getInscriptionType$.next(res.xml);
        this.getAutopsyAuthors(res.xml);
        this.galleryActiveIndex = 0;
        //this.getCommentaryReq$.next(res.xml);

      }
    }),

  )

  tempXml: any;
  getInterpretativeContent: Observable<string[]> = this.getInterpretativeReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    tap(req => this.tempXml = req.xml),
    map(req => this.textService.mapXmlRequest(req)),
    map(req => getTeiChildren(req)),
    switchMap(arrayNodes => this.textService.getCustomInterpretativeData(arrayNodes).pipe(catchError(err => this.thereWasAnError()))),
    /* tap(data => this.currentTokensList = data.tokens), */
    map(data => buildCustomInterpretative(this.renderer, data.teiNodes, data.leidenNodes, data.tokens)),
    tap(x => {
      this.getAnnotationReq$.next(this.currentElementId)
      this.getCommentaryReq$.next(this.tempXml)
      this.tempXml = null
    })
  );

  getAnnotations: Observable<any> = this.getAnnotationReq$.pipe(
    filter(elementId => !isNaN(elementId)),
    tap(id => console.log(id)),
    switchMap(id => this.textService.getAnnotation(id)),
    switchMap(results => iif(
      () => results.length != 0,
      this.textService.getForms(results),
      this.stopRequest(),
    )),
    tap(formsAndAnnotations => this.mapNodes(formsAndAnnotations)),
    tap(x => this.loadingInterpretative = false)
  )


  getDiplomaticContent: Observable<string[]> = this.getDiplomaticReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    map(rawXml => this.textService.mapXmlRequest(rawXml)),
    switchMap(req => req.xml != '' ? this.textService.getHTMLContent(req).pipe(
      catchError(error => {
        console.error('An error occurred:', error);
        return (of())
      }),
    ) : of()),
    map(html => leidenDiplomaticBuilder(html, this.isVenetic)),
    tap(x => {
      //console.log(x);
      this.loadingDiplomatic = false
    })
  );

  getTranslation: Observable<any> | undefined = this.getTranslationReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    //map(req => this.textService.mapXmlRequest(req)),
    //switchMap(req => req.xml != '' ? this.textService.getHTMLTeiNodeContent({xmlString : req.xml}).pipe(catchError(err => this.thereWasAnError())) : of()),
    map(res => getTranslationByXml(res.xml)),
    tap(res => this.loadingTranslation = false)
  );

  getBibliography: Observable<Book[]> | undefined = this.getBibliographyReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getBibliography(xml)),
    tap(biblio => this.loadingBibliography = false)
  );

  externalReferences: MenuItem[] = [];
  externalReferencesCounter: string = '';
  getFacsimile: Observable<Graphic[]> | undefined = this.getFacsimileReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getFacsimile(xml)),
    tap(facsimile => {
      if (facsimile) {
        facsimile.forEach(fac => {
          if (fac.isPdf || fac.isExternalRef) {
            let item = {
              label: fac.description.length > 50 ? fac.description.substring(0, 50) + "..." : fac.description,
              url: fac.url
            }
            this.externalReferences.push(item)
          }
        })
      }
      this.externalReferencesCounter = this.externalReferences.length.toString();
      this.loadingFacsimile = false
    })
  );

  getCommentary: Observable<Array<string>> = this.getCommentaryReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getCommentaryXml(xml, this.renderer)),
    delay(500),
    tap((output: any) => {

      if (output.onlyText && output.onlyText.length > 0) {
        let tmp = [];

        if (output.onlyText) {
          output.onlyText.forEach((element: any) => {
            tmp.push(element)
          });
        }


        if (output.referenced) {
          for (const key in output.referenced) {
            // Usa l'operatore spread per aggiungere gli elementi dell'array corrente a arrayDestinazione

            let innerHTMLs = output.referenced[key].map((elemento: Element) => elemento.outerHTML);
            // Usa l'operatore spread per aggiungere i valori estratti a arrayDestinazione
            tmp.push(...innerHTMLs);
          }
        }

        this.onlyTextCommentary = tmp
      }
      if (output.referenced && Object.keys(output.referenced).length > 0) {
        this.mapCommentaryNodes(output.referenced)
      }


      this.loadingCommentary = false;
    })
  );

  getApparatus: Observable<Array<string>> = this.getApparatusReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getApparatus(xml, this.renderer)),
    tap(xml => this.loadingApparatus = false)
  );

  getInscriptionType: Observable<any> = this.getApparatusReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getInscriptionType(xml)),
    tap(xml => this.loadingApparatus = false)
  );

  mapsLoading: boolean = false;
  getGetoDataFromFileId: Observable<any> = this.getGetoDataFromFile$.pipe(
    tap(x => this.mapsLoading = true),
    delay(1000),
    tap(x => this.initializeMap()),
    switchMap(file => {
      if (file != null) {
        return this.mapsService.getSingleLocation(file.originalPlace).pipe(
          takeUntil(this.destroy$),
          debounceTime(3000),
          catchError(err => {
            this.thereWasAnError();
            return of(null); // restituisci un array vuoto in caso di errore
          })
        );
      } else {
        return of(null);
      }
    }),
    delay(3000),
    tap(res => this.drawSingleMap(res))
  );

  activeIndex: number = 0;

  searchForm: FormGroup = new FormGroup({
    word: new FormControl(null),
    title: new FormControl(null),
    id: new FormControl(null),
    otherId: new FormControl(null),
    language: new FormControl(null),
    dateOfOriginNotBefore: new FormControl(null),
    dateOfOriginNotAfter: new FormControl(null),
    ancientName: new FormControl(null),
    inscriptionType: new FormControl(null),
    objectType: new FormControl(null),
    material: new FormControl(null),
    alphabet: new FormControl(null)
  });




  constructor(private route: Router,
    private activatedRoute: ActivatedRoute,
    private textService: TextsService,
    private mapsService: MapsService,
    private ngZone: NgZone,
    private popupService: PopupService,
    private renderer: Renderer2,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {



    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event) => {
        if (event) {
          this.fileNotAvailable = false;
          const keys = Object.keys(event);
          const values = Object.values(event);
          

          if (keys) {
            for (const [key, value] of Object.entries(event)) {
              if (!this.allowedOperators.includes(key) ||
                event[key] == '' ||
                (Array.isArray(event[key]) && Array.from(event[key]).length > 1)) {
                return;
              }
            }
          }
          if (keys.length > 1) {
            this.showSpinner = true;
            this.textService.restoredTypeSearch();
            this.textService.restoredLocationSearch();
            this.pagination({} as Paginator, keys[1], values[1])
          }
          if (keys[0] == 'file') {

            let fileId = values[0];
            this.getFileByIdReq$.next(fileId);

          } else {
            if (this.singleMap) {
              this.singleMap.off();
              this.singleMap?.remove();
              this.isMapInitialized = false;
            }

          }

        }
      }
    );



    this.leafletMapOptions = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 15,
          minZoom: 5,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        ),
      ],
      zoom: 7,
      center: [42.296818, 12.254809]
    };



    this.searchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      delay(100),
      debounceTime(1000)).subscribe(
        data => {
          const queryParams = new URLSearchParams(window.location.search);
          if (this.searchForm.touched && queryParams.get('file') == null) {
            this.buildTextQuery(data)
          }
        }
      )
  }

  ngAfterViewInit(): void {

  }

  onChangeTabView(event: any) {
    this.activeIndex = event.index;
  }


  isMapInitialized = false;

  initializeMap() {
    if (!this.isMapInitialized) {
      // Initialize the map here
      this.singleMap = L.map('singleMap').setView([42.296818, 12.254809], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.singleMap);
      this.isMapInitialized = true;
    }



  }

  drawSingleMap(geoData: GlobalGeoDataModel) {
    // First, ensure the map is initialized


    // Then, proceed to add the circle
    if (geoData) {
      if (this.singleCircle && this.singleMap && this.singleMap.hasLayer(this.singleCircle)) {
        this.singleMap.removeLayer(this.singleCircle);
      }

      this.singleCircle = L.circle([geoData.reprPoint.latitude, geoData.reprPoint.longitude], { radius: 500 });

      if (this.singleMap && this.singleCircle) {
        this.singleMap.addLayer(this.singleCircle);
        this.singleMap.panTo([geoData.reprPoint.latitude, geoData.reprPoint.longitude]);

        this.mapsLoading = false;
      }
    }
  }

  getChar(i: number): string {
    return String.fromCharCode(97 + i);
  }

  buildTextQuery(formData: any, f?: number, r? : number) {
    this.somethingWrong = false;
    this.showSpinner = true;
    this.route.navigate(
      [],
      {
        relativeTo: this.activatedRoute,
        queryParams: { filter: 'search' },
        queryParamsHandling: 'merge',
      }
    )
    let queryParts: string[] = [];

    queryParts.push(`_doc__itAnt_ID="_REGEX_.*"`)

    if (formData.word) {
      queryParts.push(` word="_REGEX_.*${formData.word}.*"`);
    }

    if (formData.title) {
      queryParts.push(` _doc__title="_REGEX_.*${formData.title}.*"`);
    }

    if (formData.id) {
      queryParts.push(`_doc__itAnt_ID="_REGEX_.*${formData.id}.*"`);
    }

    if (formData.otherId) {
      queryParts.push(`_doc__traditionalIDs__traditionalID="_REGEX_.*${formData.otherId}.*"  |  _doc__trismegistos__trismegistosID="_REGEX_.*${formData.otherId}.*"`);
    }

    if (formData.dateOfOriginNotBefore) {
      queryParts.push(`_doc__dateOfOriginNotBefore="${formData.dateOfOriginNotBefore}"`);
    }

    if (formData.dateOfOriginNotAfter) {
      queryParts.push(`_doc__dateOfOriginNotAfter="${formData.dateOfOriginNotAfter}"`);
    }

    if (formData.ancientName) {
      queryParts.push(`_doc__originalPlace__modernNameUrl="${formData.ancientName}"`);
    }

    if (formData.language) {
      queryParts.push(`_doc__language__ident="${formData.language}"`);
    }

    if (formData.inscriptionType) {
      queryParts.push(`_doc__inscriptionType="${formData.inscriptionType}"`);
    }

    if (formData.objectType) {
      queryParts.push(`_doc__support__objectType="${formData.objectType}"`);
    }

    if (formData.material) {
      queryParts.push(`_doc__support__material="${formData.material}"`);
    }

    if (formData.alphabet) {
      queryParts.push(`_doc__alphabet="${formData.alphabet}"`);
    }

    const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';
    console.log(query);
    if(!r && !f){
      this.first = 0;
      this.rows = 8;
    }
    
    if (query != '' && query != '[_doc__itAnt_ID="_REGEX_.*"]') {

      this.paginationItems = this.textService.filterAttestations(query, f ? f : this.first, r ? r : this.rows).pipe(
        catchError(error => {
          console.error('An error occurred:', error);
          if (error.status != 200) this.thereWasAnError() // Stampa l'errore sulla console
          return of([])// Ritorna un Observable con una struttura di AnnotationsRows vuota
        }),
        tap(x => this.showSpinner = false)
      );
      this.totalRecords = this.textService.countFiles(query)
    } else {
      this.textService.restoreFilterAttestations();
      this.getAllData(this.first, this.rows)
    }



  }

  clearDates() {
    this.searchForm.get('dateOfOriginNotAfter')?.setValue(null, { emitEvent: true })
  }

  clearLocation() {
    this.searchForm.get('ancientName')?.setValue(null, { emitEvent: true })
  }

  handleAutocompleteFilter(evt: any) {

    this.searchForm.markAllAsTouched();

    if (evt.modernName != '') {
      this.searchForm.get('ancientName')?.setValue(evt.modernUri, { emitEvent: false })
    }

    this.searchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  markAsTouched() {
    this.searchForm.markAllAsTouched();
  }

  resetFields() {
    this.searchForm.reset();
    this.first = 0;
    this.rows = 6;
    this.getAllData();
  }

  isDragging = false;
  startY = 0;
  startHeight = 0;

  onMouseDown(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div) return;

    // Clicked on bottom border
    if (event.offsetY > 45) {
      this.isDragging = true;
      this.startY = event.clientY;
      this.startHeight = div.clientHeight;

      // Add mousemove and mouseup listeners directly to the document
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  onMouseMove(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div || !this.isDragging) return;

    const diff = event.clientY - this.startY;
    div.style.height = `${this.startHeight + diff}px`;
  }

  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Remove mousemove and mouseup listeners from the document
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  stopRequest() {
    this.loadingInterpretative = false;
    return EMPTY;
  }


  ngOnDestroy(): void {

    this.destroy$.next(true);
    this.destroy$.complete();

  }

  getAllData(f?: number, r?: number): void {
    this.showSpinner = true;
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 8; }


    this.paginationItems = this.textService.paginationItems(this.first+1, this.rows).pipe(
      tap(x => this.showSpinner =false),
      shareReplay(),
    );

    this.totalRecords = this.textService.countFiles();

  }

  goToDefaultUrl() {
    this.route.navigate(['/texts'], { queryParams: { filter: 'all' } });
  }

  filterByDate(century: number, f?: number, r?: number): void {
    if (century) {
      if (!f && !r) { this.first = 0; this.rows = 8; this.paginationItems = this.textService.filterByDate(century).pipe(map(text => text.slice(this.first, this.rows))) }
      if (f || r) { this.paginationItems = this.textService.filterByDate(century).pipe(map(text => text.slice(f, r))) }

      this.totalRecords = this.textService.countFiles(`[_doc__itAnt_ID="_REGEX_.*" & _doc__dateOfOriginNotBefore="${century}" & _doc__dateOfOriginNotAfter="${century+100}"]`)
      this.showSpinner=false;
    } else {
      this.getAllData(f, r);
    }
  }


  filterByLocation(locationId: string, f?: number, r?: number): void {
    if(this.textService.getSavedSearchLocation() && this.textService.getSavedSearchLocation().length > 0){
      if(f && r && (f>=r)){
        r = f+r;
      }

      this.paginationItems = of(this.textService.getSavedSearchLocation().slice(f, r))
      
    }else{
      if (locationId) {
        if (!f && !r) { this.first = 0; this.rows = 8; this.paginationItems = this.textService.filterByLocation(locationId).pipe(tap(x=> this.showSpinner = false)) }
        if (f || r) { this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text => text.slice(f, r))) }
  
        this.showSpinner = false;
        this.totalRecords = this.textService.filterByLocation(locationId).pipe(map(texts => texts.length || 0))
      } else {
        this.getAllData(f, r);
      }
    }
  }

  
  filterByType(type: string, f?: number, r?: number): void {
    if(this.textService.getTypeSavedSearch() && this.textService.getTypeSavedSearch().length > 0){
      if(f && r && (f>=r)){
        r = f+r;
      }
      this.showSpinner = false;
      this.paginationItems = of(this.textService.getTypeSavedSearch().slice(f, r))
      
    }else{
      if (type) {
        if (!f && !r) { this.first = 0; this.rows = 8; this.paginationItems = this.textService.filterByType(type).pipe(tap(x=> this.showSpinner = false)) }
        if (f || r) { this.paginationItems = this.textService.filterByType(type).pipe(map(text => text.slice(f, r))) }
  
        this.showSpinner = false;
        this.totalRecords = this.textService.filterByType(type).pipe(map(texts => texts.length || 0))
      } else {
        this.getAllData(f, r);
      }
    }
  }

  

  galleryActiveIndex = 0;
  displayCustom: boolean = false;
  private buttonElement: HTMLElement | null = null;

  imageClick(index: Graphic) {
    this.galleryActiveIndex = index.index;

    setTimeout(() => {
      this.buttonElement = document.querySelector('.p-ripple.p-element.p-galleria-close');
      if (this.buttonElement) {
        this.buttonElement.addEventListener('click', this.closeGallery.bind(this));
      }

    }, 500);
  }

  closeGallery(item: any) {
    this.displayCustom = false;
  }


  pagination(event: Paginator, ...args: any[]) {
    this.showSpinner = true;
    this.getTextContentReq$.next(NaN)
    if (Object.keys(event).length != 0) { this.first = event.first; this.rows = event.rows; }
    if (Object.keys(event).length == 0) { this.first = 0; this.rows = 8; }

    //let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    if (args.length > 0) { args = args.filter(query => query != null) }
    if (args.length == 0) {
      this.getAllData(this.first, this.rows);
    }
    if (args.length == 1) {
      if (args[0] == 'search') {
        this.buildTextQuery(this.searchForm.value, this.first, this.rows);
      }else{
        this.getAllData(this.first, this.rows);
      }

     
    }
    if (args.length > 1) {
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch (filter) {
        case 'all': this.getAllData(this.first, this.rows); break;
        case 'date': this.filterByDate(value, this.first, this.rows); break;
        case 'place': this.filterByLocation(value, this.first, this.rows); break;
        case 'location': this.filterByLocation(value, this.first, this.rows); break;
        case 'type': this.filterByType(value, this.first, this.rows); break;
      }
      return;
    }



  }


  drawMap(geoData: GlobalGeoDataModel[]): void {

    geoData.forEach(geoPlaceData => {
      const RADIUS = 2000;
      const METERS_PER_ATT = 100;

      const attestationsCount = geoPlaceData.attestations.files.length;

      let radius = RADIUS + (attestationsCount * METERS_PER_ATT);
      let circleMarker = circle([geoPlaceData.reprPoint.latitude, geoPlaceData.reprPoint.longitude], { radius: radius }).on('click mouseover', event => {
        console.log(event);
        let eventType = event.type;
        if (eventType == 'mouseover') {
          circleMarker.bindPopup(this.popupService.showGeoPopup(geoPlaceData)).openPopup();
        }
        if (eventType == 'click') {
          this.ngZone.run(() => {
            this.route.navigate(
              ['/texts'],
              {
                queryParams:
                {
                  filter: 'location',
                  place: geoPlaceData.modernId
                }
              }
            );
          })
        }

      })
      circleMarker.bindPopup
      this.layers.push(circleMarker);
    })


  }


  showHideRestorations() {
    let interpretativeDiv: Array<HTMLElement> = Array.from(this.interpretativeText.nativeElement.getElementsByClassName('gap'));

    
    interpretativeDiv.forEach(
      element => {
        if (element.style.opacity == '0') {

          element.setAttribute('style', 'opacity: 1');
        } else {
          element.setAttribute('style', 'opacity: 0');

        }

      }
    )
    
    if(this.diplomaticText && this.diplomaticText.nativeElement){
      let diplomaticDiv: Array<HTMLElement> = Array.from(this.diplomaticText.nativeElement.getElementsByClassName('gap'));

      diplomaticDiv.forEach(
        element => {
          if (element.style.opacity == '0') {

            element.setAttribute('style', 'opacity: 1');
          } else {
            element.setAttribute('style', 'opacity: 0');

          }

        }
      )
    }
    
  }


  thereWasAnError() {
    //this.somethingWrong = true;
    return EMPTY;
  }


  loadOverlayPanel(evt: any) {
    console.log(evt.target);
    let formId = evt.target.attributes.formid.nodeValue;
    this.container?.clear();

    let formData = null;

    this.arrayDynamicComponents.forEach(
      element => {
        if (element.form == formId) {
          formData = element;
        }
      }
    )

    const componentRef: ComponentRef<DynamicOverlayComponent> | undefined = this.container?.createComponent(DynamicOverlayComponent);
    (<DynamicOverlayComponent>componentRef?.instance).label = formId;
    if (formData != undefined) {
      (<DynamicOverlayComponent>componentRef?.instance).formData = formData;
    }
    (<DynamicOverlayComponent>componentRef?.instance).toggleOverlayPanel(evt);
  }

  showModal() {
    this.displayModal = true;
  }

  hideModal() {
    this.displayModal = false;
  }


  highlightNode(evt: any) {
    //console.log(evt)

    if (evt) {
      let xmlid = evt.data;

      let nodes = document.querySelectorAll(`span[xmlid="${evt.data}"]:not(.spanReference)`);

      nodes.forEach(span => {
        span.classList.add('highlight')
      })
    }
  }

  deactivateNode(evt: any) {
    //console.log(evt)

    if (evt) {
      let xmlid = evt.data;

      let nodes = document.querySelectorAll(`span[xmlid="${evt.data}"]:not(.spanReference)`);

      nodes.forEach(span => {
        span.classList.remove('highlight')
      })
    }
  }

  loadCommentaryData(evt: any) {
    let data = evt.data;

    this.referencedCommentary = [];
    console.log(evt)
    if (data) {
      data.forEach((element: Element) => {
        this.referencedCommentary.push(element.outerHTML);
      });
    }

    setTimeout(() => {
      console.log(data)
      data.forEach((element: Element) => {
        let spans = element.querySelectorAll(`[xmlid]`)
        if (spans.length > 0) {
          spans.forEach((subSpan: Element) => {
            let xmlid = subSpan.getAttribute('xmlid')

            let nodes = document.querySelectorAll(`.spanReference[xmlid="${xmlid}"]`)

            nodes.forEach(domElement => {
              domElement.addEventListener('mouseenter', (event) => {
                this.highlightNode({ evt: this, data: xmlid, clickEvent: event });
              });

              domElement.addEventListener('mouseleave', (event) => {
                this.deactivateNode({ evt: this, data: xmlid, clickEvent: event });
              });
            })

          })
        }
      });
    }, 100);
  }

  mapNodes(data: any[] | unknown) {
    if (Array.isArray(data)) {

      let nodes = document.querySelectorAll('[tokenid]');

      if (nodes.length > 0) {
        nodes.forEach(node => {
          let tokenid = node.getAttribute('tokenid');

          data.forEach(
            element => {
              let annotation = element.annotation;
              let lexicalEntry = annotation.attributes.lexicalEntry;
              let formid = annotation.value;

              if (annotation.attributes.node_id == tokenid) {

                node.setAttribute('lexicalentry', lexicalEntry);
                node.setAttribute('formid', formid);
                node.classList.add('notation');
                node.addEventListener('click', this.loadOverlayPanel.bind(this));
                this.arrayDynamicComponents.push(element.form);


              }
            }
          )
        })
      }

    }

  }

  getAutopsyAuthors(rawXml: string) {
    this.autopsyAuthors = [];
    this.seenAuthors = [];

    let nodes = new DOMParser().parseFromString(rawXml, "text/xml");
    let autopsyAuthorsNodes = Array.from(nodes.querySelectorAll("provenance[type='observed']"));

    if (autopsyAuthorsNodes.length > 0) {
      autopsyAuthorsNodes.forEach(element => {
        //console.log(element);

        if (element.getAttribute('subtype') == 'seen') {
          let seenAuthors = {
            name: element.textContent ? element.textContent : '',
            subtype: element.getAttribute('subtype') || '',
            when: element.getAttribute('when') ? element.getAttribute('when') : null,
            notAfter: element.getAttribute('notAfter') ? element.getAttribute('notAfter') : null,
          };
          this.seenAuthors.push(seenAuthors);
        } else if (element.getAttribute('subtype') == 'autopsied') {
          let autopsyAuthor = {
            name: element.textContent ? element.textContent : '',
            subtype: element.getAttribute('subtype') || '',
            when: element.getAttribute('when') ? element.getAttribute('when') : null,
            notAfter: element.getAttribute('notAfter') ? element.getAttribute('notAfter') : null,
          };
          this.autopsyAuthors.push(autopsyAuthor)

        }

      })
    }

  }

  mapCommentaryNodes(data: any) {

    if (data && Object.keys(data).length > 0) {

      Object.keys(data).forEach(
        element => {
          console.log(data[element])
          let xmlid = element;
          let nodes = document.querySelectorAll(`[xmlid="${element}"]`)
          if (nodes.length > 0) {

            let span = nodes[0]
            span.classList.add('comment');
            span.addEventListener('mouseenter', (event) => {
              this.loadCommentaryData({ evt: this, data: data[element], clickEvent: event });
            });

            data[element].forEach((sub: Element) => {
              let subReferences = sub.querySelectorAll(`[xmlid]`)
              if (subReferences.length > 0) {
                subReferences.forEach((subSpan: Element) => {
                  subSpan.classList.add('spanReference');
                  /* subSpan.addEventListener('click', (event) => {
                    this.highLightNodes({evt: this, data: data[element], clickEvent: event});
                  }); */
                })
              }
            });
            //mouse hover and appiccicare le info dei nodi
            //click, fisso dati
          }
        }
      )
    }
  }

  printDocument() {
    window.print();
  }

}
