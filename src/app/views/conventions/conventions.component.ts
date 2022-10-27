import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-conventions',
  templateUrl: './conventions.component.html',
  styleUrls: ['./conventions.component.scss']
})
export class ConventionsComponent implements OnInit {

  products : object[] = [];
  constructor() { }

  ngOnInit(): void {
    this.products = [{
      "code": 1,
      "name": "Etta Bedome",
      "category": "Consumer Durables",
      "quantity": 76
    }, {
      "code": 2,
      "name": "Alphonso Dreamer",
      "category": "Technology",
      "quantity": 78
    }, {
      "code": 3,
      "name": "Edythe Margeram",
      "category": "Public Utilities",
      "quantity": 99
    }, {
      "code": 4,
      "name": "Harwilll Antonsen",
      "category": "n/a",
      "quantity": 99
    }, {
      "code": 5,
      "name": "Vannie Tutchener",
      "category": "Capital Goods",
      "quantity": 73
    }, {
      "code": 6,
      "name": "Harman Burriss",
      "category": "Finance",
      "quantity": 39
    }, {
      "code": 7,
      "name": "Nellie Ellerman",
      "category": "Capital Goods",
      "quantity": 43
    }, {
      "code": 8,
      "name": "Myca Payfoot",
      "category": "n/a",
      "quantity": 26
    }]
  }

}
