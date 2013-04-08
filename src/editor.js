var cbEdit = {
    log: function() {
        window.console.log.apply( window.console, arguments );
    },

    keys: Object.keys || function( obj ) {
        var ks = []
          , has = Object.prototype.hasOwnProperty;
        for ( var k in obj ) {
            if ( has.call( obj, k ) ) {
                ks.push( k );
            }
        }
        return ks;
    },

    getDoc: function( context ) {
        return context && ( context.ownerDocument || context ) || document;
    },

    getContainer: function( context ) {
        return context || document.body || document.documentElement;
    },

    /**
     * @param {Element} elem
     * @param {string|Function} typ
     * @param {...string} va_args
     */
    closest: function( elem, typ, va_args ) {
        var func, nm, val;
        if ( arguments.length < 3 ) {
            func = /** @type {Function} */( typ );
            typ = '';

        } else {
            switch ( typ ) {
            case 'tag':
                val = arguments[2];
                func = function( el ) {
                    return el.nodeName.toLowerCase() === val;
                };
                break;
            case 'attr':
                nm = arguments[2];
                val = arguments[3];
                func = function( el ) {
                    return val === null ? !el.hasAttribute( nm )
                         : !val ? el.hasAttribute( nm )
                         : el.getAttribute( nm ) === val;
                }
                break;
            }
        }
        while ( elem ) {
            if ( elem.nodeType > 3 ) {
                elem = null;
            }
            if ( elem ) {
                if ( func( elem ) ) {
                    break;
                }
                elem = /** @type {Element} */( elem.parentNode );
            }
        }
        return elem;
    },

    jsonML: function( data, context ) {
        var doc = cbEdit.getDoc( context )
          , edata = data[0]
          , elt = typeof edata === 'string' ?
                      doc.createElement( edata )
                  : cbEdit.getContainer( edata )
          , atdata = data[1];
        for ( var aks = cbEdit.keys( atdata ), i = 0, k; (k = aks[i]); i++ ) {
            var v = atdata[k]
              , at = doc.createAttribute( k );
            if ( v ) {
                at.value = v;
            }
            elt.setAttributeNode( at );
        }
        for ( var i = 2, len = data.length; i < len; i++ ) {
            var ch = data[i];
            elt.appendChild(
                (typeof ch === 'string' ? doc.createTextNode( ch )
                 : cbEdit.jsonML( ch, doc ))
            );
        }
        return elt;
    },

    rfocusinout: /^(?:focusin|focusout)$/,
    rnonspace: /\S+/g,
    rlbreak: /\r\n|[\r\n]/g,
    rscript: /^script$/i,

    /**
     * @param {Element} elt
     * @param {string} evt
     * @param {Function} listener
     * @param {Object=} context
     */
    listen: function( elt, evt, listener, context ) {
        var handler = function() { listener.apply( context, arguments ); }
          , stoppers = []
          , evts = evt.match( cbEdit.rnonspace );
        void function reg( i ) {
            var evt = evts[i];
            if ( !evt ) {
                return;
            }
            if ( elt.addEventListener ) {
                var useCapture = false;
                if ( cbEdit.rfocusinout.test( evt ) ) {
                    useCapture = true;
                    evt = evt === 'focusin' ? 'focus' : 'blur';
                }
                elt.addEventListener( evt, handler, useCapture );
                stoppers.push(function() { elt.removeEventListener( evt, handler, useCapture ); });
            } else {
                elt.attachEvent( 'on'+evt, listener );
                stoppers.push(function() { elt.detachEvent( 'on'+evt, listener ); });
            }
            reg( i + 1 );
        }( 0 );
        return { stop: function() {
            for ( var i = 0, f; (f = stoppers[i]); i++ ) {
                f();
            }
        } };
    },

    /**
     * @param {Element} elt
     * @param {string} evt
     * @param {Function} listener
     * @param {Object=} context
     */
    one: function( elt, evt, listener, context ) {
        var h = cbEdit.listen( elt, evt, function() {
            listener.apply( this, arguments );
            h.stop();
        }, context );
        return h;
    },

    getText: function( elt ) {
        return elt.textContent || elt.innerText;
    },

    setText: 'textContent' in document.documentElement ? function( elt, v ) {
        elt.textContent = v;
    } : function( elt, v ) {
        elt.innerText = v;
    },

    fragify: function( htmlText, context ) {
        var doc = cbEdit.getDoc( context )
          , frag = doc.createDocumentFragment()
          , dummy = doc.createElement( 'div' );
        dummy.innerHTML = htmlText;
        while ( dummy.firstChild ) {
            frag.appendChild( dummy.firstChild );
        }
        return frag;
    },

    support: {
        w3cSelection: !!window.getSelection
    },

    getRange: function( context ) {
        var doc = cbEdit.getDoc( context ), sel;
        if ( cbEdit.support.w3cSelection ) {
            sel = doc.defaultView.getSelection();
            if ( !sel.rangeCount ) {
                // TODO
                return;
            }
            return sel.getRangeAt( 0 );
        } else {
            return doc.selection.createRange();
        }
    },

    extractContents: function( rng, context ) {
        return cbEdit.support.w3cSelection ? rng.extractContents()
             : cbEdit.fragify( rng.htmlText, context );
    },

    extractSelectedLines: function( context ) {
        var doc = cbEdit.getDoc( context );

        if ( !doc.queryCommandState( 'insertunorderedlist' ) ) {
            doc.execCommand( 'insertunorderedlist' );
        }

        var isW3C = cbEdit.support.w3cSelection
          , rng = cbEdit.getRange( doc )
          , rContext;

        if ( !rng ) {
            return [];
        }

        rContext = isW3C ? rng.startContainer : rng.parentElement();

        var ul = cbEdit.closest( rContext, 'tag', 'ul' );
        if ( ul ) {
            ul.parentNode.removeChild( ul );
        }
        var items = ul.getElementsByTagName( 'li' )

        var res = [];
        for ( var i = 0, item; (item = items[i]); i++ ) {
            res.push( item.innerHTML );
        }

        return res;
    },

    init: function( context ) {
        var doc = cbEdit.getDoc( context )
           , menu = cbEdit.jsonML(
                [ 'menu', { 'panel': '' },
                    [ 'span', { 'bp-indicator': '' } ],
                    [ 'button', { 'command': 'bold' } ],
                    [ 'button', { 'command': 'italic' } ],
                    [ 'button', { 'command': 'insertunorderedlist' } ],
                    [ 'button', { 'widget': 'menu' } ],
                    [ 'button', { 'widget': 'user' } ],
                    [ 'button', { 'preview': 'angular' } ] ],
                doc
            );

        cbEdit.getContainer( context ).appendChild( menu );

        var actElem;
        cbEdit.listen( doc, 'focusin', function( e ) {
            actElem = actElem ? 
                cbEdit.closest( doc.activeElement, 'attr', 'contenteditable' )
              : doc.activeElement;
        });

        menu.onclick = function( e ) {
            var btn = cbEdit.closest( e.target, 'tag', 'button' );
            if ( btn ) {
                if ( btn.hasAttribute( 'command' ) ) {
                    doc.execCommand( btn.getAttribute( 'command' ) );
                    if ( actElem ) {
                        actElem.focus();
                    }
                } else if ( btn.hasAttribute( 'widget' ) ) {
                    var widget = cbEdit.widget[ btn.getAttribute( 'widget' ) ]
                      , newNode = widget( cbEdit.extractSelectedLines( doc ), doc )
                      , rng = cbEdit.getRange( doc );
                    if ( !rng ) {
                        return;
                    }
                    if ( cbEdit.support.w3cSelection ) {
                        rng.deleteContents();
                        rng.insertNode( newNode );
                    } else {
                        rng.pasteHTML( newNode.outerHTML );
                    }
                } else {
                    if ( actElem ) {
                        cbEdit.preview[ btn.getAttribute( 'preview' ) ]( actElem );
                    }
                }
            }
        };

        if ( !doc.cbInited ) {
            doc.cbInited = true;
            cbEdit.one( doc, 'mousemove mousewheel DOMMouseScroll orientationchange',
                        function() {
                            menu.setAttribute( 'panel', 'expanded' );
                        } );
        }
    },

    widget: {
        menu: function( htmlLines, doc ) {
            var line , el = doc.createElement( 'menu' );
            for ( var i = 0, len = htmlLines.length; i < len; i++ ) {
                line = htmlLines[i];
                var li = el.appendChild( doc.createElement( 'button' ) );
                li.innerHTML = line;
            }
            return el;
        },
        user: function( htmlLines, doc ) {
            var el = cbEdit.jsonML( 
                [ 'div', { 'ng-controller': 'userCtrl' } ], doc );
            el.innerHTML = '<div>'+htmlLines.join('</div><div>')+'</div>';
            return el;
        }
    },

    preview: {
        angular: function( actElem ) {
            var doc = actElem.ownerDocument
              , win = doc.defaultView.open()
              , wdoc = win.document
              , whead = wdoc.getElementsByTagName( 'head' )[0];

            for ( var i = 0, ss; (ss = document.styleSheets[i]); i++ ) {
                var html = ss.href ? '<link rel="stylesheet" href="'+ss.href+'">'
                         : ( ss.ownerNode || ss.owningElement ).outerHTML;
                whead.insertAdjacentHTML( 'beforeend', html );
            }

            wdoc.body.insertAdjacentHTML( 'beforeend', actElem.innerHTML );

            var ngscr = wdoc.createElement( 'script' );
            ngscr.src = 'https://ajax.googleapis.com/ajax/libs/angularjs/1.1.4/angular.min.js';
            ngscr.async = true;
            wdoc.body.appendChild( ngscr );

            ngscr.onload = ngscr.onreadystatechange = function() {
                setTimeout(function() {
                    if ( win.angular ) {
                        win.angular.module( 'myApp', [] );
                        win.userCtrl = function($scope) {
                            $scope.firstName = 'Evan';
                            $scope.lastName = 'Jones';
                        };
                        win.userCtrl.$inject = [ '$scope' ];
                        win.angular.bootstrap( wdoc, [ 'myApp' ] );
                    }
                }, 0);
            };

        }
    }

};

setTimeout( cbEdit.init, 0 );
