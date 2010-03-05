// create a new browser object load url, call onload on completion
function mkBrowser(url, onload)
{
    // make sure there is handle onto the HTTP Response Header
    httpRequestObserver.register();
    
    var browser = document.createElement('browser');

    browser.setAttribute('flex', 1);
    browser.setAttribute('disablehistory', true);
    browser.setAttribute('src', url);
    browser.setAttribute('height', 768);
    browser.setAttribute('width', 1024);

    // need to append to a document to become available
    document.documentElement.appendChild(browser);

    // hook into onload
    browser.listen = progress_listener(browser, onload);
    browser.addProgressListener(browser.listen, Components.interfaces.nsIWebProgress.NOTIFY_STATE_NETWORK);

    return browser;
};

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
    const STATE_STOP =
        Components.interfaces.nsIWebProgressListener.STATE_STOP;
    const STATE_IS_NETWORK =
        Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK;
    const STATE_IS_WINDOW =
        Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW;

    if (KrdWrdApp.param.follow)
    {
        // page load timeout ID - track the overall timeout
        tmoutid = setTimeout(function() {
                browser.removeProgressListener(browser.listen);
                browser.stop();
                print("APP: STOP");
                }, KrdWrdApp.param.tmout);
    }

    var brow = browser;
    var handler = on_loaded;
    var pl =
        {

        _requestsStarted: 0,
        _requestsFinished: 0,
        _pageFuzzyFinished: 0,
        _timeoutid: 0, 

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
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_IS_REQUEST) {
                        args += 'R';
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT) {
                        args += 'D';
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK) {
                        args += 'N';
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW) {
                        args += 'W';
                }
                args += '][';
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_START) {
                        args += 'Start';
                        this._requestsStarted++;
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_REDIRECTING) {
                        args += 'Redir';
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_TRANSFERRING) {
                        args += 'Trans';
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_NEGOTIATING) {
                        args += 'Negot';
                }
                if (flg   & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                        args += 'Stop';
                        this._requestsFinished++;
                }
                args += ']';
                // verbose(args + ' ' + this._requestsStarted  + '/' + this._requestsFinished);
               
                // now we know about the HTTP Response for the document
                // no more responses needed (img, etc...)
                if ((flg & Components.interfaces.nsIWebProgressListener
                            .STATE_IS_REQUEST) && 
                        (flg & Components.interfaces.nsIWebProgressListener.
                         STATE_IS_DOCUMENT) && 
                        (flg & Components.interfaces.nsIWebProgressListener.
                         STATE_TRANSFERRING))
                {
                    httpRequestObserver.unregister();
                }

                if ((flg & STATE_STOP) && (flg & STATE_IS_NETWORK))
                {
                    if (this._timeoutid) 
                    { 
                        clearTimeout(this._timeoutid);
                        this._timeoutid = null;
                    } 

                    fetchGrabDo(prog,req);
                } 
                else if (flg & STATE_STOP && this._requestsStarted > 1 && this._requestsStarted - this._requestsFinished <= 1) 
                {
                    if (this._timeoutid) 
                    { 
                        clearTimeout(this._timeoutid);
                        this._timeoutid = null;
                    } 

                    this._timeoutid = setTimeout(function(){ 
                            this._pageFuzzyFinished = 1; 
                            fetchGrabDo(prog,req);
                            },5000);
                }

                function fetchGrabDo(prog,req)
                {
                    // we have a page within the timeout - clear it
                    if (this.tmoutid) clearTimeout(tmoutid);

                    print('FUZ: ' + this._pageFuzzyFinished );

                    var doc = brow.contentDocument;
                    if ((prog.DOMWindow == brow.contentWindow) && req)
                    {
                        brow.removeProgressListener(brow.listen);
                        // wait a second for the engine to settle
                        setTimeout(function()
                            {
                                try
                                {
                                    handler(doc, prog.DOMWindow);
                                }
                                catch (e)
                                {
                                    error("Error handling onLoad of " + doc.location
                                          + ": " + format_exception(e));
                                }
                             },
                        500);
                    }
                }
                return 0;
            },
        onLocationChange:
            function() { return 0; },
        onProgressChange:
            function() { return 0; },
        onStatusChange:
            function() { return 0; },
        onSecurityChange:
            function() { return 0; },
        };
    return pl;
};

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
                // don't bother about redirect
                if (hrs != 302) print("HRS: "+httpChannel.responseStatus);
            } catch (err) {
                // this should not happen
            }
        } else {
            // print(topic);
        }
    },

    get observerService() 
    {
        return Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
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
                                     };
                                 };
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.setRequestHeader('Content-Encoding', 'multipart/form-data')
    request.setRequestHeader("Content-length", data.length);
    request.send(data);
};

// vim: et
