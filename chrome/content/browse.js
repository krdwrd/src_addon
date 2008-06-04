// create a new browser object load url, call onload on completion
function mkBrowser(url, onload)
{
    var browser = document.createElement('browser');

    browser.setAttribute('flex', 0);
    browser.setAttribute('src', url);
    browser.setAttribute('height', 1);
    browser.setAttribute('width', 1);

    // need to append to a document to become available
    document.documentElement.appendChild(browser);

    // hook into onload
    browser.addProgressListener(progress_listener(onload));

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
function progress_listener(on_loaded)
{
  const STATE_STOP =
    Components.interfaces.nsIWebProgressListener.STATE_STOP;
  const STATE_IS_WINDOW = 
    Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW;
  var pl = 
  {
    handler : on_loaded, 
    once : false,
    QueryInterface : function(aIID)
    {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
    }, 
    onStateChange:function(prog, req, flg, stat)
    {
      if ((flg & STATE_STOP) && (flg & STATE_IS_WINDOW)) 
      {
          var doc = prog.DOMWindow.document;

          if (doc.location != "about:blank")
          {
              if (this.once)
              {
                  print("WARN: double-loaded " + doc.location);
              }
              else
              {
                  this.once = true;
                  var handler = this.handler;
                  // wait a second for the engine to settle
                  setTimeout(function() {
                          try
                          {
                              handler(doc, prog.DOMWindow);
                          }
                          catch (e)
                          {
                              error("Error handling onLoad of " + doc.location 
                                  + ": " + format_exception(e));
                          }
                      }, 1000);
              }
          }
      }
    },
    onLocationChange:function(a,b,c)
    {
    },
    onProgressChange:function(a,b,c,d,e,f)
    {
    },
    onStatusChange:function(a,b,c,d)
    {
    },
    onSecurityChange:function(a,b,c)
    {
    },
  };
  return pl;
};

// vim: et
