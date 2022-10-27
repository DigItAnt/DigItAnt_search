import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-glossary',
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})
export class GlossaryComponent implements OnInit {

  products : object[] = [];
  constructor() { }

  ngOnInit(): void {
    this.products = [{
      "item": "Pinaceae",
      "definition": "Public-key scalable middleware"
    }, {
      "item": "Aristolochiaceae",
      "definition": "Function-based cohesive portal"
    }, {
      "item": "Cyperaceae",
      "definition": "Compatible 3rd generation policy"
    }, {
      "item": "Scrophulariaceae",
      "definition": "Team-oriented eco-centric installation"
    }, {
      "item": "Ranunculaceae",
      "definition": "Operative zero administration instruction set"
    }, {
      "item": "Scrophulariaceae",
      "definition": "De-engineered intangible challenge"
    }, {
      "item": "Aspleniaceae",
      "definition": "Seamless uniform architecture"
    }, {
      "item": "Fabaceae",
      "definition": "Streamlined attitude-oriented protocol"
    }, {
      "item": "Fabaceae",
      "definition": "Triple-buffered actuating monitoring"
    }, {
      "item": "Opegraphaceae",
      "definition": "Reduced executive algorithm"
    }, {
      "item": "Geraniaceae",
      "definition": "Reduced actuating alliance"
    }, {
      "item": "Polygonaceae",
      "definition": "Diverse holistic utilisation"
    }, {
      "item": "Asteraceae",
      "definition": "Networked empowering system engine"
    }, {
      "item": "Cyperaceae",
      "definition": "Customizable uniform knowledge base"
    }, {
      "item": "Polygonaceae",
      "definition": "Networked actuating knowledge base"
    }, {
      "item": "Ranunculaceae",
      "definition": "Managed analyzing ability"
    }, {
      "item": "Solanaceae",
      "definition": "Multi-channelled encompassing support"
    }, {
      "item": "Malvaceae",
      "definition": "Streamlined well-modulated infrastructure"
    }, {
      "item": "Fabaceae",
      "definition": "Assimilated impactful leverage"
    }, {
      "item": "Cyperaceae",
      "definition": "Versatile web-enabled flexibility"
    }, {
      "item": "Polygonaceae",
      "definition": "Upgradable global internet solution"
    }, {
      "item": "Nyctaginaceae",
      "definition": "Re-engineered intangible definition"
    }, {
      "item": "Liliaceae",
      "definition": "Extended dynamic definition"
    }, {
      "item": "Arecaceae",
      "definition": "Multi-lateral transitional core"
    }, {
      "item": "Cuscutaceae",
      "definition": "Fully-configurable web-enabled success"
    }, {
      "item": "Polemoniaceae",
      "definition": "Monitored non-volatile help-desk"
    }, {
      "item": "Fabaceae",
      "definition": "Sharable solution-oriented time-frame"
    }, {
      "item": "Chenopodiaceae",
      "definition": "Reactive fault-tolerant knowledge user"
    }, {
      "item": "Malvaceae",
      "definition": "Configurable global website"
    }, {
      "item": "Cladoniaceae",
      "definition": "Diverse next generation solution"
    }, {
      "item": "Rubiaceae",
      "definition": "User-centric hybrid software"
    }, {
      "item": "Cupressaceae",
      "definition": "Intuitive solution-oriented model"
    }, {
      "item": "Orobanchaceae",
      "definition": "Compatible directional capacity"
    }, {
      "item": "Piperaceae",
      "definition": "User-friendly asynchronous workforce"
    }, {
      "item": "Lamiaceae",
      "definition": "Monitored user-facing architecture"
    }, {
      "item": "Ranunculaceae",
      "definition": "Synergized 24/7 moderator"
    }, {
      "item": "Brassicaceae",
      "definition": "Operative interactive ability"
    }, {
      "item": "Iridaceae",
      "definition": "Organic eco-centric website"
    }, {
      "item": "Caryophyllaceae",
      "definition": "Profound modular model"
    }, {
      "item": "Scrophulariaceae",
      "definition": "Profound 24/7 standardization"
    }, {
      "item": "Fabaceae",
      "definition": "Visionary methodical knowledge user"
    }, {
      "item": "Fabaceae",
      "definition": "Organic 4th generation adapter"
    }, {
      "item": "Commelinaceae",
      "definition": "Enterprise-wide composite alliance"
    }, {
      "item": "Malvaceae",
      "definition": "Automated multi-tasking capability"
    }, {
      "item": "Orchidaceae",
      "definition": "Triple-buffered didactic open system"
    }, {
      "item": "Poaceae",
      "definition": "Fully-configurable heuristic standardization"
    }, {
      "item": "Scrophulariaceae",
      "definition": "Polarised high-level application"
    }, {
      "item": "Aspleniaceae",
      "definition": "Profound object-oriented superstructure"
    }, {
      "item": "Scrophulariaceae",
      "definition": "User-friendly human-resource function"
    }, {
      "item": "Asteraceae",
      "definition": "Customer-focused contextually-based instruction set"
    }, {
      "item": "Fagaceae",
      "definition": "Stand-alone scalable matrices"
    }, {
      "item": "Poaceae",
      "definition": "Upgradable static circuit"
    }, {
      "item": "Sapotaceae",
      "definition": "Object-based web-enabled hierarchy"
    }, {
      "item": "Betulaceae",
      "definition": "Implemented attitude-oriented protocol"
    }, {
      "item": "Euphorbiaceae",
      "definition": "Re-engineered multi-state challenge"
    }, {
      "item": "Asteraceae",
      "definition": "Front-line 6th generation flexibility"
    }, {
      "item": "Liliaceae",
      "definition": "Optional composite array"
    }, {
      "item": "Fagaceae",
      "definition": "Reduced motivating website"
    }, {
      "item": "Myrtaceae",
      "definition": "Customizable real-time utilisation"
    }, {
      "item": "Asteraceae",
      "definition": "Proactive modular success"
    }, {
      "item": "Buxbaumiaceae",
      "definition": "Ergonomic discrete approach"
    }, {
      "item": "Saxifragaceae",
      "definition": "Team-oriented holistic solution"
    }, {
      "item": "Alismataceae",
      "definition": "Adaptive non-volatile groupware"
    }, {
      "item": "Caprifoliaceae",
      "definition": "Front-line heuristic software"
    }, {
      "item": "Violaceae",
      "definition": "De-engineered actuating matrix"
    }, {
      "item": "Lobariaceae",
      "definition": "User-centric intangible circuit"
    }, {
      "item": "Geraniaceae",
      "definition": "Object-based bifurcated frame"
    }, {
      "item": "Poaceae",
      "definition": "Networked asymmetric secured line"
    }, {
      "item": "Campanulaceae",
      "definition": "Extended multimedia database"
    }, {
      "item": "Scrophulariaceae",
      "definition": "Pre-emptive scalable benchmark"
    }, {
      "item": "Poaceae",
      "definition": "Streamlined neutral time-frame"
    }, {
      "item": "Urticaceae",
      "definition": "Up-sized exuding approach"
    }, {
      "item": "Araucariaceae",
      "definition": "Synergistic upward-trending encoding"
    }, {
      "item": "Verrucariaceae",
      "definition": "User-centric multimedia encryption"
    }, {
      "item": "Asteraceae",
      "definition": "Reactive user-facing contingency"
    }, {
      "item": "Gleicheniaceae",
      "definition": "Visionary disintermediate extranet"
    }, {
      "item": "Fabaceae",
      "definition": "Pre-emptive 24 hour secured line"
    }, {
      "item": "Cyperaceae",
      "definition": "Public-key directional open architecture"
    }, {
      "item": "Onagraceae",
      "definition": "Innovative impactful superstructure"
    }, {
      "item": "Dryopteridaceae",
      "definition": "Horizontal disintermediate contingency"
    }, {
      "item": "Primulaceae",
      "definition": "Centralized optimizing extranet"
    }, {
      "item": "Cactaceae",
      "definition": "User-centric system-worthy hierarchy"
    }, {
      "item": "Liliaceae",
      "definition": "Profound global website"
    }, {
      "item": "Thamnobryaceae",
      "definition": "Re-engineered national toolset"
    }, {
      "item": "Fabaceae",
      "definition": "Ergonomic discrete middleware"
    }, {
      "item": "Asteraceae",
      "definition": "Cross-group reciprocal synergy"
    }, {
      "item": "Rosaceae",
      "definition": "Ergonomic bi-directional structure"
    }, {
      "item": "Rosaceae",
      "definition": "Compatible 3rd generation standardization"
    }, {
      "item": "Asteraceae",
      "definition": "Customizable multi-tasking initiative"
    }, {
      "item": "Ulmaceae",
      "definition": "Optimized tertiary open system"
    }, {
      "item": "Brassicaceae",
      "definition": "Versatile object-oriented capability"
    }, {
      "item": "Apiaceae",
      "definition": "Networked needs-based moratorium"
    }, {
      "item": "Poaceae",
      "definition": "Reduced background framework"
    }, {
      "item": "Poaceae",
      "definition": "Persistent web-enabled groupware"
    }, {
      "item": "Poaceae",
      "definition": "Distributed web-enabled conglomeration"
    }, {
      "item": "Lecanoraceae",
      "definition": "Robust client-driven extranet"
    }, {
      "item": "Rosaceae",
      "definition": "Object-based real-time software"
    }, {
      "item": "Boraginaceae",
      "definition": "Ameliorated foreground website"
    }, {
      "item": "Brassicaceae",
      "definition": "Ameliorated foreground customer loyalty"
    }, {
      "item": "Saxifragaceae",
      "definition": "Re-engineered solution-oriented complexity"
    }]
  }

}
