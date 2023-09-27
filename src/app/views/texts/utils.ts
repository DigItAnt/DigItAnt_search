import { Renderer2 } from "@angular/core";
import { CenturyPipe } from "src/app/pipes/century-pipe/century-pipe.pipe";
import { Book, BookAuthor, BookEditor, Graphic, ListAndId, TextMetadata, TextToken, XmlAndId } from "src/app/services/text/text.service";
import { AuthorCounter, DateCounter } from "../lexicon/lexicon.component";
import { CenturiesCounter, LocationsCounter, TypesCounter, LanguagesCounter, ObjectTypeCounter, MaterialCounter, DuctusCounter, WordDivisionTypeCounter, AlphabetCounter } from "./texts.component";

const allowedCenturies: number[] = [];
for (let i = -600; i <= 200; i += 100) {
    allowedCenturies.push(i);
}

export function groupByCenturies(texts: TextMetadata[]): CenturiesCounter[] {
    let tmp: CenturiesCounter[] = [];
    
    allowedCenturies.forEach(value => {
        let count: number = 0;

        if (value < 0) {
            count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOriginNotBefore) >= value && parseInt(cur.dateOfOriginNotBefore) < (value + 100)) ? ++acc : acc, 0);
        } else {
            count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOriginNotBefore) > (value - 100) && parseInt(cur.dateOfOriginNotBefore) <= value) ? ++acc : acc, 0);
        }

        if (count > 0) {
            tmp.push({ century: value, count: count, label: CenturyPipe.prototype.transform(value) });
        }
    })

    return tmp;
}

export function groupLocations(texts: TextMetadata[], truncatePlaces?: boolean): LocationsCounter[] {
    let tmp: LocationsCounter[] = [];
    let count: number = 0;

    texts.forEach(text => {
        count = texts.reduce((acc, cur) => cur.originalPlace.ancientNameUrl == text.originalPlace.ancientNameUrl ? ++acc : acc, 0);
        if (count > 0) {
            let ancientPlaceStripId = text.originalPlace.ancientNameUrl.split('/')[text.originalPlace.ancientNameUrl.split('/').length - 1];
            let modernPlaceStripId = text.originalPlace.modernNameUrl.split('/')[text.originalPlace.modernNameUrl.split('/').length - 1];
            tmp.push({
                ancientPlaceUrl: text.originalPlace.ancientNameUrl,
                ancientPlaceId: ancientPlaceStripId,
                ancientPlaceLabel: (truncatePlaces ? text.originalPlace.ancientName : text.originalPlace.ancientName.split(',')[0]),
                modernPlaceUrl: text.originalPlace.modernNameUrl,
                modernPlaceId: modernPlaceStripId,
                modernPlaceLabel: text.originalPlace.modernName,
                count: count
            })
        }
    });

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.ancientPlaceId]: object }), {})
    )

    return tmp;
}


export function groupTypes(texts: TextMetadata[]): TypesCounter[] {
    let tmp: TypesCounter[] = [];
    let count: number = 0;
    texts.forEach(text => {
        count = texts.reduce((acc, cur) => cur.inscriptionType == text.inscriptionType ? ++acc : acc, 0);
        if (count > 0) {
            tmp.push({ inscriptionType: text.inscriptionType, count: count })
        }
    });

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.inscriptionType]: object }), {})
    )

    return tmp;
}

export function groupAlphabet(texts: TextMetadata[]): AlphabetCounter[] {
    let tmp: AlphabetCounter[] = [];
    let count: number = 0;
    texts.forEach(text => {
        count = texts.reduce((acc, cur) => cur.alphabet == text.alphabet ? ++acc : acc, 0);
        if (count > 0) {
            tmp.push({ alphabet: text.alphabet, count: count })
        }
    });

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.alphabet]: object }), {})
    )

    return tmp;
}


export function groupLanguages(texts: TextMetadata[]): LanguagesCounter[] {
    let tmp: LanguagesCounter[] = [];
    let count: number = 0;


    texts.forEach(text => {
        count = texts.reduce((acc, cur) => cur.language[0].ident == text.language[0].ident ? ++acc : acc, 0);
        if (count > 0) { tmp.push({ language: text.language[0].ident, count: count }) }
    })

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.language]: object }), {})
    )


    return tmp;
}

export function groupObjectTypes(texts: TextMetadata[]): ObjectTypeCounter[] {
    let tmp: ObjectTypeCounter[] = [];
    let count: number = 0;


    texts.forEach(text => {
        count = texts.reduce((acc, cur) => cur.support.objectType == text.support.objectType ? ++acc : acc, 0);
        if (count > 0) { tmp.push({ objectType: text.support.objectType, count: count }) }
    })

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.objectType]: object }), {})
    )


    return tmp;
}


export function groupMaterial(texts: TextMetadata[]): MaterialCounter[] {
    let tmp: MaterialCounter[] = [];
    let count: number = 0;


    texts.forEach(text => {
        count = texts.reduce((acc, cur) => cur.support.material == text.support.material ? ++acc : acc, 0);
        if (count > 0) { tmp.push({ material: text.support.material, count: count }) }
    })

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.material]: object }), {})
    )


    return tmp;
}


export function groupDuctus(texts: TextMetadata[]): DuctusCounter[] {
    let tmp: DuctusCounter[] = [];

    texts.forEach(text => {
        // Se ductus è null, undefined o una stringa vuota, continua alla prossima iterazione
        if (!text.bodytextpart) {
            return;
        }
        
        let count = texts.reduce((acc, cur) => {
            if (cur.bodytextpart && cur.bodytextpart.ductus && cur.bodytextpart.ductus == text.bodytextpart.ductus) {
                return ++acc;
            }
            return acc;
        }, 0);
        if (count > 0) {
            tmp.push({ ductus: text.bodytextpart.ductus, count: count })
        }
    });

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.ductus]: object }), {})
    );

    return tmp;
}


export function groupWordDivisionType(texts: TextMetadata[]): WordDivisionTypeCounter[] {
    let tmp: WordDivisionTypeCounter[] = [];

    texts.forEach(text => {
        // Se ductus è null, undefined o una stringa vuota, continua alla prossima iterazione
        if (!text.wordDivisionType) {
            return;
        }

        // Conta solo gli elementi per cui wordDivisionType non è una stringa vuota
        let count = texts.reduce((acc, cur) => cur.wordDivisionType && cur.wordDivisionType !== "" && cur.wordDivisionType == text.wordDivisionType ? ++acc : acc, 0);
        if (count > 0) {
            tmp.push({ type: text.wordDivisionType, count: count });
        }
    });

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.type]: object }), {})
    );

    return tmp;
}

export function getTeiChildren(req: XmlAndId): ListAndId {

    let array: Array<Element[]> = [];
    let divFaces = Array.from(new DOMParser().parseFromString(req.xml, "text/xml").querySelectorAll('div[subtype="interpretative"] div'));
    divFaces.forEach(
        divFacesElement => {
            let face: Element[] = [];
            let abChildren = Array.from(divFacesElement.querySelectorAll('ab')[0].children);
            abChildren.forEach(
                abChildrenElement => {
                    face.push(abChildrenElement)
                }
            )

            array.push(face)
        }
    )
    return { list: array, id: req.nodeId };
}

export function getBibliography(rawXml: string): Array<any> {

    let biblio_array: Array<any> = [];
    let nodes = Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('biblStruct'))

    nodes.forEach(element => {
        let book_obj = {} as Book;

        let title = Array.from(element.querySelectorAll('title'));
        let author = Array.from(element.querySelectorAll('author'));
        let editor = Array.from(element.querySelectorAll('editor'));
        let url = element.attributes.getNamedItem('corresp');
        let date = Array.from(element.querySelectorAll('date'));
        let page = Array.from(element.querySelectorAll('biblScope[unit="page"]'));

        let volume = Array.from(element.querySelectorAll('biblScope[unit="volume"]'));
        let entry = Array.from(element.querySelectorAll('biblScope[unit="entry"]'));
        let issue = Array.from(element.querySelectorAll('biblScope[unit="issue"]'));


        if (title.length > 0) {
            title.forEach(t => {
                book_obj.title = t.innerHTML;
                return true;
            })
        }

        if (date.length > 0) {
            date.forEach(d => {
                book_obj.date = d.innerHTML;
            })
        }

        if (page.length > 0) {
            page.forEach(p => {
                book_obj.page = p.innerHTML;
            })
        }

        if (volume.length > 0) {
            volume.forEach(p => {
                book_obj.volume = p.innerHTML;
            })
        }

        if (entry.length > 0) {
            entry.forEach(p => {
                book_obj.entry = p.innerHTML;
            })
        }

        if (issue.length > 0) {
            issue.forEach(p => {
                book_obj.issue = p.innerHTML;
            })
        }

        if (author.length > 0) {
            author.forEach(aut => {
                let name = aut.querySelector('forename');
                let surname = aut.querySelector('surname');
                if (name != undefined && surname != undefined) {
                    book_obj.author = {} as BookAuthor;
                    book_obj.author.name = name.innerHTML;
                    book_obj.author.surname = surname.innerHTML;
                    return true;
                } else {
                    return false;
                }

            })
        }

        if (editor.length > 0) {
            editor.forEach(edit => {
                let name = edit.querySelector('forename');
                let surname = edit.querySelector('surname');
                if (name != undefined && surname != undefined) {
                    book_obj.editor = {} as BookEditor;
                    book_obj.editor.name = name.innerHTML;
                    book_obj.editor.surname = surname.innerHTML;
                    return true;
                } else {
                    return false;
                }

            })
        }

        if (url) {
            if (url.nodeValue != undefined) {
                book_obj.url = url.nodeValue;
            }
        }

        //console.log(book_obj);
        biblio_array.push(book_obj)
    })
    return biblio_array;
}



export function getCommentaryXml(rawHTML: string, renderer: Renderer2): any {

    let onlyTextComments: Array<string> = [];
    let referencedComments: any = {};

    if (Array.from(new DOMParser().parseFromString(rawHTML, "text/xml").querySelectorAll('div[type="commentary"')).length != 0) {

        let commentaryNotes = Array.from(new DOMParser().parseFromString(rawHTML, "text/xml").querySelectorAll('div[type="commentary"')[0].children);

        commentaryNotes.forEach(teiNote => {

            let teiNoteChildren = Array.from(teiNote.children);
            let target: string | null | undefined = '';

            //Elementi che si rifanno al testo
            if (teiNote instanceof Element && teiNote.localName == 'note' && teiNote.hasAttribute('target')) {
                target = teiNote.getAttribute('target') != null ? teiNote.getAttribute('target')?.replace('#', '') : '';
            }

            teiNoteChildren.forEach(child => {


                let childNodes = Array.from(child.childNodes);

                let paragraph = renderer.createElement('p') as Element;
                childNodes.forEach((element: any) => {

                    if (element instanceof Text) {
                        let paragraphText = renderer.createText(element.nodeValue ? element.nodeValue : '');
                        renderer.appendChild(paragraph, paragraphText)
                    }

                    if (element instanceof Element) {

                        if ((element.nodeName == 'tei:ref') && element.hasAttribute('target')) {
                            let biblioTargetUrl = element.getAttribute('target') ? element.getAttribute('target') : '';
                            let link = renderer.createElement('a') as Element;

                            const regex = /.*\.xml$/;
                            let isAFile = false;
                            if (biblioTargetUrl && biblioTargetUrl != '') {
                                isAFile = regex.test(biblioTargetUrl)

                            }

                            if (isAFile) {
                                link.setAttribute('href', biblioTargetUrl ? "/texts?file=" + biblioTargetUrl.replace('.xml', '') : '')
                                link.setAttribute('target', '_blank')
                            } else {
                                link.setAttribute('href', biblioTargetUrl ? biblioTargetUrl : '')
                                link.setAttribute('target', '_blank')
                            }



                            let biblioChildNodes = Array.from(element.childNodes)
                            biblioChildNodes.forEach((bibChild) => {
                                let biblioText = renderer.createText(bibChild.textContent ? bibChild.textContent : '');
                                renderer.appendChild(link, biblioText)
                            })

                            renderer.appendChild(paragraph, link)
                        }

                        if (element.nodeName == 'tei:rs') {

                            let correspData = element.getAttribute('corresp') ? element.getAttribute('corresp') : '';

                            const regex = /https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}/;
                            let isALink = false;

                            if (correspData && correspData != '') {

                                isALink = regex.test(correspData)
                            }

                            if (isALink) {
                                let link = renderer.createElement('a') as Element;
                                link.setAttribute('href', correspData ? correspData : '')
                                link.setAttribute('target', '_blank')

                                let biblioChildNodes = Array.from(element.childNodes)
                                biblioChildNodes.forEach(bibChild => {
                                    let biblioText = renderer.createText(element.nodeValue ? element.nodeValue : '');
                                    renderer.appendChild(link, biblioText)
                                })

                                renderer.appendChild(paragraph, link)
                            } else {
                                let span = renderer.createElement('span') as Element;

                                if (correspData != '') {
                                    span.setAttribute('xmlid', correspData?.toString() ? correspData.toString() : '')
                                }

                                let spanText = renderer.createText(element.textContent ? element.textContent : '')

                                renderer.appendChild(span, spanText)

                                renderer.appendChild(paragraph, span)
                            }

                        }
                    }
                })

                if (target && target != '') {
                    if (!referencedComments[target]) referencedComments[target] = []
                    referencedComments[target].push(paragraph)
                } else {
                    onlyTextComments.push(paragraph.outerHTML)
                }

            });

        })
        return { referenced: referencedComments, onlyText: onlyTextComments };
    } else {
        return []
    }

}

export function getInscriptionType(xml : string) : any {
    if (Array.from(new DOMParser().parseFromString(xml, "text/xml").querySelectorAll('textClass')).length != 0) {
        let inscriptionType = new DOMParser().parseFromString(xml, "text/xml").querySelectorAll('textClass')[0];
        const termNode = inscriptionType.querySelector('term');
        const keywordNode = inscriptionType.querySelector('keywords');

        if (termNode && keywordNode) {
            const term = termNode.textContent;
            const url = keywordNode.getAttribute('scheme');

            // Costruisce e ritorna l'oggetto JSON
            if (term && url) {
                return {
                    term: term,
                    url: url
                };
            }
        }

        // Ritorna null se non può estrare il termine e l'URL
        return null;
    }
}

export function getApparatus(rawXml: string, renderer: Renderer2): Array<string> {

    let apparatusArray: Array<string> = [];

    if (Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('app')).length != 0) {
        let apparatusNodes = Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('app'));
        apparatusNodes.forEach(app => {
            const lemNode = app.querySelector("lem");
            const rdgNode = app.querySelector("rdg");
            const refNodes = rdgNode?.querySelectorAll("ref");
            const lineNumber = app.getAttribute("from")?.split('_').pop();

            // Create the span elements
            const containerSpan = renderer.createElement('span');
            const lineNumberSpan = renderer.createElement('span');
            const contentSpan = renderer.createElement('span');

            // Set classes for the lineNumberSpan
            renderer.addClass(lineNumberSpan, 'linenumber');

            // Set the content for the lineNumberSpan
            if (lineNumber) {
                const text = renderer.createText(lineNumber);
                renderer.appendChild(lineNumberSpan, text);
            }

            // Set the content for the contentSpan
            if (lemNode) {
                const lemText = lemNode.textContent ? lemNode.textContent + ' - ' : '';
                renderer.appendChild(contentSpan, renderer.createText(lemText));
            }
            if (rdgNode && rdgNode.firstChild && rdgNode.firstChild.nodeValue) {
                const rdgText = rdgNode.firstChild.nodeValue.trim();
                renderer.appendChild(contentSpan, renderer.createText(rdgText));
            }
            refNodes?.forEach((refNode, index) => {
                const link = renderer.createElement('a');
                const href = refNode.getAttribute('target');
                const bibl = refNode.querySelector("bibl")?.textContent;
                renderer.setAttribute(link, 'href', href || '#');
                renderer.setAttribute(link, 'target', '_blank');
                renderer.appendChild(link, renderer.createText(bibl || ''));
                renderer.appendChild(contentSpan, link);
                if (index < (refNodes.length - 1)) {
                    renderer.appendChild(contentSpan, renderer.createText(' and '));
                }
            });
            if (rdgNode) renderer.appendChild(contentSpan, renderer.createText(')'));

            // Append the lineNumberSpan and contentSpan to the containerSpan
            renderer.appendChild(containerSpan, lineNumberSpan);
            renderer.appendChild(containerSpan, contentSpan);

            // Append the containerSpan to the array
            apparatusArray.push(containerSpan.outerHTML);
        })
        return apparatusArray;
    } else {
        return []
    }

}

export function getFacsimile(rawXml: string): Array<Graphic> {

    let graphic_array: Array<Graphic> = [];
    let nodes = Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('facsimile graphic'))

    nodes.forEach(element => {
        let graphic_obj = {} as Graphic;

        let desc = Array.from(element.querySelectorAll('desc'));
        let url = element.getAttribute('url');

        if (desc.length > 0) {
            desc.forEach(d => {
                if (d.textContent != undefined || d.textContent != null) {
                    graphic_obj.description = d.textContent
                } else {
                    graphic_obj.description = 'No description'
                }

            })
        }

        if (url) {
            if (url.includes('.jpg')) {
                graphic_obj.isPdf = false;
            } else if (url.includes('.pdf')) {
                graphic_obj.isPdf = true;
            } else {
                graphic_obj.isExternalRef = true;
            }

            graphic_obj.url = url;
        }

        //console.log(graphic_obj);
        graphic_array.push(graphic_obj)
    })
    return graphic_array;
}

export function leidenDiplomaticBuilder(html: string, isVenetic?: boolean) {
    let resHTMLArray = [];
    let nodes = new DOMParser().parseFromString(html, "text/html").querySelectorAll('#diplomatic .textpart');
    if (!isVenetic) {
        nodes.forEach(el => resHTMLArray.push(el.innerHTML));
    } else {
        resHTMLArray.push(nodes[1].innerHTML);
    }
    return resHTMLArray;
}


export function buildCustomInterpretative(renderer: Renderer2, TEINodes: Array<Array<Element>>, LeidenNodes: Array<Array<string>>, token: TextToken[]): Array<string> {
    let HTMLArray: Array<string> = [];


    TEINodes.forEach((innerArray, innerIndex) => {
        let HTML = '';
        let lineCounter = 0;
        innerArray.forEach((element, elementIndex) => {
            let begin: number = NaN, end: number = NaN, tokenId: number = NaN, nodeId: number = NaN, xmlId: string | null = null, nodeValue: string | null;
            if (element.getAttribute('xml:id') != null) {
                nodeValue = element.getAttribute('xml:id');

                token.forEach(t => {
                    if (t.xmlid == nodeValue) {
                        begin = t.begin;
                        end = t.end;
                        tokenId = t.id;
                        nodeId = t.node;
                        xmlId = t.xmlid;
                    }
                });
            }

            if (!isNaN(tokenId) && xmlId != null) {
                let leidenNode = LeidenNodes[innerIndex][elementIndex];
                let body = new DOMParser().parseFromString(leidenNode, "text/html").querySelector('body');
                if (body != null) {
                    Array.from(body.childNodes).forEach((sub: any) => {
                        if (sub instanceof HTMLElement) {
                            HTML += sub.outerHTML;
                        }

                        if (sub instanceof Text && sub.textContent != null && /[a-zA-ZàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõäëïöüÿÄËÏÖÜŸ]/.test(sub.textContent)) {
                            token.forEach(
                                tok => {
                                    if (tok.xmlid == nodeValue) {
                                        let span = renderer.createElement('span') as Element;
                                        let text = renderer.createText(sub.textContent != null ? sub.textContent : 'null');
                                        renderer.setAttribute(span, 'tokenId', tokenId?.toString());
                                        renderer.setAttribute(span, 'nodeId', nodeId?.toString());
                                        renderer.setAttribute(span, 'start', begin?.toString());
                                        renderer.setAttribute(span, 'end', end?.toString());
                                        renderer.setAttribute(span, 'xmlId', xmlId != undefined ? xmlId.toString() : 'null');
                                        renderer.appendChild(span, text)
                                        HTML += span.outerHTML;
                                    }
                                }
                            )
                        }

                        if(sub instanceof HTMLBRElement){
                            let span = renderer.createElement('span') as Element;
                                renderer.addClass(span, 'linenumber');
                                span.setAttribute('xmlid', sub.id);
                                let text = renderer.createText((lineCounter + 1).toString());
                                renderer.appendChild(span, text);

                                HTML += span.outerHTML;
                                lineCounter = lineCounter + 1;
                        }

                    });
                }
            } else {
                let leidenNode = LeidenNodes[innerIndex][elementIndex];
                let body = new DOMParser().parseFromString(leidenNode, "text/html").querySelector('body');
                if (body != null) {

                    Array.from(body.childNodes).forEach((sub: any) => {

                        if (sub instanceof HTMLElement) {
                            if (nodeValue && sub.tagName == 'BR') {
                                let span = renderer.createElement('span') as Element;
                                renderer.addClass(span, 'linenumber');
                                span.setAttribute('xmlid', nodeValue);
                                let text = renderer.createText((lineCounter + 1).toString());
                                renderer.appendChild(span, text);
                                if (sub.tagName == 'BR' && (sub.id == 'al1' || sub.id == 'al1b')) {
                                    HTML += span.outerHTML;
                                } else {
                                    HTML += sub.outerHTML;
                                    HTML += span.outerHTML;
                                }
                                lineCounter = lineCounter + 1;
                            } else {
                                if (!(sub.tagName == 'SPAN' && sub.classList.contains('linenumber'))) {
                                    HTML += sub.outerHTML;
                                }
                            }
                        }
                        if (sub instanceof Text) {
                            HTML += sub.textContent;
                        }
                    });
                }
            }
        });
        HTMLArray.push(HTML);
    });

    return HTMLArray;
}

export function getTranslationByXml(rawXml: string) {
    let translations: Array<string> = [];

    let nodes = new DOMParser().parseFromString(rawXml, "text/xml");
    let translationNodes = Array.from(nodes.querySelectorAll("div[type='translation'"));

    if (translationNodes.length > 0) {
        translationNodes.forEach(element => {
            //console.log(element);
            let children = Array.from(element.children);
            if (children.length > 0) {
                children.forEach(child => {
                    console.log(child);
                    if (child.nodeName == 'tei:p') {
                        translations.push(child.innerHTML)
                    }
                })
            }
        })
    }

    console.log(translations)
    return translations;
}

export function groupByLexicalEntry(elements: any[]): any[] {
    return elements.reduce((acc, element) => {
        const key = element.lexicalEntry;

        // Dividere key in parti
        const parts = key.split('#')[1].split('_');
        const label = parts[0]; // la parte dopo "#"
        const pos = parts[1]; // la parte dopo il primo "_"
        const language = parts[2]; // la parte dopo il secondo "_"

        const existingGroupIndex = acc.findIndex((group: any) => group.label === label);

        if (existingGroupIndex !== -1) {
            // Il gruppo esiste, aggiungi l'elemento al suo array di items
            acc[existingGroupIndex].items.push(element);
        } else {
            // Il gruppo non esiste, crea un nuovo gruppo
            acc.push({
                label: label,
                value: key,
                pos: pos,
                language: language,
                items: [element]
            });
        }

        return acc;
    }, []);
}

export function groupByDates(books: Book[]): DateCounter[] {
    let tmp: DateCounter[] = [];
    let count: number = 0;
    books.forEach(book => {
        // Normalize date by extracting year and removing square brackets
        const yearRegex = /\d{4}/;
        const match = book.date.match(yearRegex);
        const normalizedDate = match ? match[0] : '';

        count = books.reduce((acc, cur) => {
            const curMatch = cur.date.match(yearRegex);
            const normalizedCurDate = curMatch ? curMatch[0] : '';
            return normalizedCurDate == normalizedDate ? ++acc : acc;
        }, 0);

        if (count > 0 && normalizedDate != '') {

            tmp.push({ date: normalizedDate, count: count });
        }
    });

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.date]: object }), {})
    );

    return tmp;
}


export function groupByAuthors(books: Book[]): any[] {
    let tmp: any[] = [];
    let count: number = 0;
    books.forEach(book => {
        count = books.reduce((acc, cur) => cur.author == book.author ? ++acc : acc, 0);
        if (count > 0) { tmp.push({ name: book.author, count: count }) }
    })

    tmp = Object.values(
        tmp.reduce((acc, object) => ({ ...acc, [object.name]: object }), {})
    )


    return tmp;
}

