// create a new browser object load url, call onload on completion
function mkBrowser(url, onload)
{
    var browser = document.createElement('browser');

    browser.setAttribute('flex', 0);
    browser.setAttribute('disablehistory', true);
    browser.setAttribute('src', url);
    browser.setAttribute('height', 1);
    browser.setAttribute('width', 1);

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

    var brow = browser;
    var handler = on_loaded;
    var pl =
        {
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
                if ((flg & STATE_STOP) && (flg & STATE_IS_NETWORK))
                {
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
