// create a new browser object load url, call onload on completion
function mkBrowser(url, onload)
{
    // make sure there is handle onto the HTTP Response Header
    httpRequestObserver.register();
    
    var browser = document.createElement('browser');

    browser.setAttribute('flex', 1);
    browser.setAttribute('disablehistory', true);
    browser.setAttribute('height', 768);
    browser.setAttribute('width', 1024);
    browser.setAttribute('src', url);

    // need to append to a document to become available
    document.documentElement.appendChild(browser);

    if (KrdWrdApp.param.follow)
    {
        print("OPT: follow mode, timeout for page load is "+KrdWrdApp.param.tmout+"ms");
        // page load timeout ID - track the overall timeout
        tmoutid = setTimeout(function() {
                // after we hit the 'STOP' button let the remainder of the 
                // logic fall into place...
                // browser.removeProgressListener(browser.listen);
                // ...and handle things:hence, DON'T remove the PListener
                print("APP: STOP");
                browser.stop();
                }, KrdWrdApp.param.tmout);
    } 
    else
    {
        print("OPT: timeout for app is "+KrdWrdApp.param.tmout+"ms");
        var timer = 
            Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);

        timer.initWithCallback({notify: function(timer) { 
            setTimeout(function() {error("TIMEOUT"); }, KrdWrdApp.param.tmout);
            }}, 0, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }



    // hook into onload
    browser.listen = progress_listener(browser, onload);
    browser.addProgressListener(browser.listen, Components.interfaces.nsIWebProgress.NOTIFY_ALL);

    // for debugging
    // observerService.addObserver({
    //     observe:function(aSubject, aTopic, aData)
    //         {
    //             //verbose("observe: "+aTopic+","+aSubject);
    //             //if (aTopic == 'http-on-modify-request')
    //             //{
    //             //    aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
    //             //    if (
    //             //        (aSubject.URI.spec.substring(0, 8) == 'https://') ||
    //             //        // (aSubject.URI.spec.substring(0, 25) == 'http://www.angolotesti.it')
    //             //        // (aSubject.URI.spec.substring(0, 42) == "http://www.angolotesti.it/js/js-engine.php") ||
    //             //        // (aSubject.URI.spec.substring(0, 23) == "http://www.facebook.com") ||
    //             //        false
    //             //       )
    //             //    {
    //             //        aSubject.loadFlags = Components.interfaces.nsICachingChannel.LOAD_ONLY_FROM_CACHE;
    //             //        aSubject.cancel(Components.results.NS_ERROR_FAILURE);
    //             //    }
    //             //    else
    //             //    {
    //             //        verbose(aTopic+":"+aSubject.URI.spec);
    //             //    }
    //             //} else if (aTopic == 'document-element-inserted')
    //             //{
    //             //   verbose(aSubject.body);
    //             //}
    //         }
    //     }, "*", false);
    return browser;
}

// open all urls in filelist in a browser window
// return list of document objects when fully loaded
function open_documents(filelist, callback)
{
    // initialize once, with filelist and callback
    if (filelist)
    {
        this.filelist = filelist;
        this.index = 0;
        this.doclist = [];
        this.callback = callback;
        this.docdone = false;
    }
    // otherwise increment the filelist pointer
    else
    {
        this.index++;
    }

    // collect documents for returning
    var ret = this.doclist;

    function handler(doc, win)
    {
        ret[ret.length] = doc;
        open_documents();
    }

    // have more files
    if (this.index < this.filelist.length)
    {
        mkBrowser(this.filelist[this.index], handler);
    }
    // done
    else if (! this.docdone)
    {
        this.docdone = true;
        this.callback(this.doclist);
    }
}

// progress listener implementing nsIWebProgressListener
// (cf. https://developer.mozilla.org/en/nsIWebProgressListener)
function progress_listener(browser, on_loaded)
{
    var STATE_IS_REQUEST = 
        Components.interfaces.nsIWebProgressListener.STATE_IS_REQUEST;
    var STATE_IS_DOCUMENT = 
        Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT;
    var STATE_IS_NETWORK =
        Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK;
    var STATE_IS_WINDOW =
        Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW;

    var STATE_START =
        Components.interfaces.nsIWebProgressListener.STATE_START;
    var STATE_REDIRECTING =
        Components.interfaces.nsIWebProgressListener.STATE_REDIRECTING;
    var STATE_TRANSFERRING =
        Components.interfaces.nsIWebProgressListener.STATE_TRANSFERRING;
    var STATE_NEGOTIATING =
        Components.interfaces.nsIWebProgressListener.STATE_NEGOTIATING;
    var STATE_STOP =
        Components.interfaces.nsIWebProgressListener.STATE_STOP;

    var STATUS_RESOLVING =
        Components.interfaces.nsISocketTransport.STATUS_RESOLVING;


    var brow = browser;
    var handler = on_loaded;
    var pl =
        {
        _requestsStarted: null,
        _requestsFinished: null,
        _pageFuzzyFinished: 0,
        _tmoutid: null, 
        _statusChange: null,
        _urqs: Array(),

        QueryInterface :
            function(aIID)
            {
                if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
                        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                        aIID.equals(Components.interfaces.nsISupports))
                    return this;
                throw Components.results.NS_NOINTERFACE;
            },
        onStateChange:
            function(prog, req, flg, stat)
            {

                var args = '[';
                if (flg   & STATE_IS_REQUEST)   { args += 'R'; }
                if (flg   & STATE_IS_DOCUMENT)  { args += 'D'; }
                if (flg   & STATE_IS_NETWORK)   { args += 'N'; }
                if (flg   & STATE_IS_WINDOW)    { args += 'W'; }
                args += '][';
                if (flg   & STATE_START)        { args += 'Start'; }
                if (flg   & STATE_REDIRECTING)  { args += 'Redir'; }
                if (flg   & STATE_TRANSFERRING) { args += 'Trans'; } 
                if (flg   & STATE_NEGOTIATING)  { args += 'Negot'; }
                if (flg   & STATE_STOP)         { args += 'Stop'; }
                args += ']';
               
                if (flg & STATE_START)
                {
                    if (flg & STATE_IS_NETWORK) 
                    {
                        pl._requestsStarted = 0;
                        pl._requestsFinished = 0;
                    }
                    if (flg & STATE_IS_REQUEST)
                    {
                        ++pl._requestsStarted;
                    }
                }
                else
                {
                    if (flg & STATE_STOP)
                    {
                        if (flg & STATE_IS_REQUEST)
                        {
                            if ( (pl._requestsFinished + 1) <= pl._requestsStarted )
                            {
                                ++pl._requestsFinished;
                            }
                        }
                    }
                }
                verbose(args + ' ' + pl._requestsStarted  + '/' + pl._requestsFinished);
                
                if ( (flg & STATE_START) && (flg & STATE_IS_DOCUMENT) )
                {
                    verbose("STATE_START && STATE_IS_DOCUMENT");
                    return 0;
                }

                if (KrdWrdApp.param.urlrqs)
                {
                    // print the URLs for document requests, and other types of
                    // requests, such as requests for inline content (e.g. images
                    // and stylesheets).
                    if ((flg & STATE_STOP) && (flg & STATE_IS_REQUEST))
                    {
                        const regex = /^(file|gopher|about|chrome|resource):/;
                        if (req && !regex.test(req.name) && (!(req.name in pl._urqs)))
                        {
                            print("URQ: "+req.name);
                            pl._urqs[req.name] = "#seen";
                        }
                    }
                }

                // now we know about the HTTP Response Code for the document;
                // no more responses needed (img, etc...)
                if ((flg & STATE_IS_REQUEST) && 
                        (flg & STATE_IS_DOCUMENT) && 
                        (flg & STATE_TRANSFERRING))
                {
                    httpRequestObserver.unregister();
                }

                // this is a proper 'page loaded'
                if ( (pl._requestsFinished == pl._requestsStarted)
                        && ( (flg & STATE_STOP) && (flg & STATE_IS_NETWORK) ) 
                        && (stat == false) )
                {
                    verbose("(_requestsFinished == _requestsStarted) " + 
                            "&& (STOP && IS_NETWORK) && stat == false ");
                    fetchGrabDo(prog,req);
                } 
                // this is a 'STOP button press'
                else if ( (flg & STATE_STOP) && (flg & STATE_IS_NETWORK) &&
                        (flg & STATE_IS_WINDOW) )
                {
                    verbose("STOP && IS_NETWORK && IS_WINDOW");
                    fetchGrabDo(prog,req);
                } 
                // however, also try to determine whether the page is about to
                // 'finish loading': we keep track of the started and finished
                // requests, and when almost all requests have finished and
                // nothing happens within a given timeout we also consider the
                // page loaded.
                // this will be reported as 'FUZ:' 
                else if (flg & STATE_STOP && pl._requestsStarted > 0 
                            && pl._requestsStarted - pl._requestsFinished <= 1) 
                {
                    clear_tmoutid();
                    pl._tmoutid = setTimeout(function() {
                        pl._pageFuzzyFinished += 1; 
                        fetchGrabDo(prog,req);
                        }, KrdWrdApp.param.tmout / 2);
                }

                function clear_tmoutid()
                {
                    if (pl._tmoutid) clearTimeout(pl._tmoutid);
                }

                function fetchGrabDo(prog,req)
                {
                    verbose("fetchGrabDo");
                    // we have a page within the timeout - clear it
                    clear_tmoutid();
                    if (this.tmoutid) {
                        clearTimeout(this.tmoutid);
                        verbose("clearTimeout(timeoutid)-ed");
                    } 

                    var doc = brow.contentDocument;
                    if (doc.location == null || doc.location == "about:blank")
                    {
                        //if (this._statusChange == undefined) {
                        //    error("DNS - server not found");
                        // this now, is more general - and does work when 
                        // using offline html-only (without content).
                        error("contacting " + browser.getAttribute('src'));

                    }

                    if ((prog.DOMWindow == brow.contentWindow) && req && 
                            (brow.removeProgressListener(brow.listen) || true))
                    {
                        print('FUZ: '+ ((pl._pageFuzzyFinished > 0) ?
                                "true" : "false"));

                        // wait a second for the engine to settle
                        setTimeout(function()
                            {
                                try
                                {
                                    handler(doc, prog.DOMWindow);
                                }
                                catch (e)
                                {
                                    error("onLoad of " + doc.location + 
                                        ": " + format_exception(e));
                                }
                             },
                        500);
                    }
                }
                return 0;
            },
        onLocationChange:
            function() { // verbose("onLocationChange"); 
                return 0; },
        onProgressChange:
            function() { // verbose("onProgressChange"); 
                return 0; },
        onStatusChange:
            function(aWebProgress, aRequest, aStatus, aMessage)
            { 
                // verbose("onStatusChange");
                if (aStatus !== STATUS_RESOLVING) 
                    { 
                        _statusChange = aStatus;
                        verbose(aMessage);
                    } 
            },
        onSecurityChange:
            function() { // verbose("onSecurityChange"); 
                return 0; }
        };
    return pl;
}

// self-contained object to observe nsIHttpChannel to have a handle onto 
// the HTTP Response Status
// use: register() and unregister()
var httpRequestObserver =
{
    observe: function(subject, topic, data)
    {
        if (topic == "http-on-examine-response" ||
                topic == "http-on-examine-cached-response")
        {
            try {
                var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);
                // Http Response Status
                hrs = httpChannel.responseStatus;
                // inform user about HRS  
                switch (hrs)
                {
                    case 200: // OK
                    case 304: // Not Modified
                        print("HRS: OK ("+httpChannel.responseStatus+")");
                        break;
                    case 301: // Moved Permanently
                    case 302: // Redirect - HTTP/1.0
                    case 303: // Redirect - HTTP/1.1
                    case 307: // Redirect - HTTP/1.1
                        print("HRS: IGN ("+httpChannel.responseStatus+")");
                        break;
                    default:
                        print("HRS: ERR ("+httpChannel.responseStatus+")");
                        break;
                }
            } catch (err) {
                verbose(err);
                // this should not happen
            }
        } else {
            verbose(topic);
        }
    },

    get observerService() 
    {
        return Components.classes["@mozilla.org/observer-service;1"].
            getService(Components.interfaces.nsIObserverService);
    },

    register: function()
    {
        verbose("httpRequestObserver.register()-ed");
        this.observerService.addObserver(this, "http-on-examine-response", false);
        this.observerService.addObserver(this, "http-on-examine-cached-response", false);
    },

    unregister: function()
    {
        verbose("httpRequestObserver.unregister()-ed");
        this.observerService.removeObserver(this, "http-on-examine-cached-response");
        this.observerService.removeObserver(this, "http-on-examine-response");
    }
};

function post_request(url, data, callback)
{
    var request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.onreadystatechange = function()
                                 {
                                     if (request.readyState == 4)
                                     {
                                         var response = request.responseText;
                                         var status = request.status;
                                         callback(response, status);
                                     }
                                 };
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.setRequestHeader('Content-Encoding', 'multipart/form-data');
    request.setRequestHeader("Content-length", data.length);
    request.send(data);
}

// vim: et
