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

    // hook into onload
    browser.listen = progress_listener(browser, onload);
    browser.addProgressListener(browser.listen, Components.interfaces.nsIWebProgress.NOTIFY_STATE_NETWORK);

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


    if (KrdWrdApp.param.follow)
    {
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

    var brow = browser;
    var handler = on_loaded;
    var pl =
        {

        _requestsStarted: 0,
        _requestsFinished: 0,
        _pageFuzzyFinished: 0,
        _timeoutids: Array(), 
        _statusChange: null,

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
                if (flg   & STATE_IS_REQUEST) {
                        args += 'R';
                }
                if (flg   & STATE_IS_DOCUMENT) {
                        args += 'D';
                }
                if (flg   & STATE_IS_NETWORK) {
                        args += 'N';
                }
                if (flg   & STATE_IS_WINDOW) {
                        args += 'W';
                }
                args += '][';
                if (flg   & STATE_START) {
                        args += 'Start';
                        this._requestsStarted++;
                }
                if (flg   & STATE_REDIRECTING) {
                        args += 'Redir';
                }
                if (flg   & STATE_TRANSFERRING) {
                        args += 'Trans';
                }
                if (flg   & STATE_NEGOTIATING) {
                        args += 'Negot';
                }
                if (flg   & STATE_STOP) {
                        args += 'Stop';
                        this._requestsFinished++;
                }
                args += ']';
                verbose(args + ' ' + this._requestsStarted  + '/' + this._requestsFinished);
               
                // now we know about the HTTP Response for the document
                // no more responses needed (img, etc...)
                if ((flg & STATE_IS_REQUEST) && 
                        (flg & STATE_IS_DOCUMENT) && 
                        (flg & STATE_TRANSFERRING))
                {
                    httpRequestObserver.unregister();
                }


                function clear_timeoutids()
                {
                    for(key in this._timeoutids)
                    {
                        clearTimeout(this._timeoutids[key]);
                    }
                    // if (this._timeoutid) 
                    // { 
                    //     clearTimeout(this._timeoutid);
                    //     this._timeoutid = null;
                    // } 
                }

                if ((flg & STATE_STOP) && (flg & STATE_IS_NETWORK))
                {
                    verbose("STATE_STOP && STATE_IS_NETWORK");
                    clear_timeoutids();
                    fetchGrabDo(prog,req);
                } 
                else if (flg & STATE_STOP && this._requestsStarted > 1 && this._requestsStarted - this._requestsFinished <= 1) 
                {
                    clear_timeoutids();
                    this._timeoutids[this._requestsStarted] = setTimeout(function(){ 
                            this._pageFuzzyFinished = 1; 
                            clear_timeoutid();
                            fetchGrabDo(prog,req);
                            }, KrdWrdApp.param.tmout / 1.5);
                }

                function fetchGrabDo(prog,req)
                {
                    verbose("fetchGrabDo");
                    // we have a page within the timeout - clear it
                    if (this.tmoutid) clearTimeout(tmoutid);

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
                        // wait a second for the engine to settle
                        setTimeout(function()
                            {
                                try
                                {
                                    print('FUZ: ' + this._pageFuzzyFinished );
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
        this.observerService.addObserver(this, "http-on-examine-response", false);
        this.observerService.addObserver(this, "http-on-examine-cached-response", false);
    },

    unregister: function()
    {
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
