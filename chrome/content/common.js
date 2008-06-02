/*
 * Static functions
 */

// get content element
function $(elem)
{
    return document.getElementById(elem);
}

// get current page source
function getHTML()
{
    return content.document.documentElement.innerHTML;
}

// generic string filter function
function filterklass(klasses, filter)
{
    if (! klasses) return '';
    var l = klasses.split(" ");
    res = "";
    for (i in l)
    {
        if (filter(l[i])) continue;
        res += l[i] + " ";
    }
    return res;
}

// filter out any krdwrd classes from css class list 'klasses' given as string
function filterkw(klasses)
{
    return filterklass(klasses, function(klass)
        {
            return (klass.substring(6, 0) == "krdwrd");
        });
}

// get krdwrd class tag
function getkwtag(klasses)
{
    return filterklass(klasses, function(klass)
        {
            return (klass.substring(10, 0) != "krdwrd-tag");
        });
}

// traverse the dom, call cb on text nodes
function traverse(body, cb)
{
    function rec(node, kw)
    {
        var cn = node.className;
        if (cn)
        {
            var tag = getkwtag(cn);
            if (tag) kw = tag;
        }
        if (node.nodeName == "#text")
        {
            if (node.data.replace( /^\s+/g, "").replace( /\s+$/g, ""))
                cb(node, kw);
        }
        for (child in node.childNodes)
        {
            cnode = node.childNodes[child];
            if (cnode.nodeName != "SCRIPT")
                rec(cnode, kw);
        }
    };
    rec(body, "krdwrd-tag-2");
};

// quit the application
function quit(forced)
{
    var appStartup = Components.classes['@mozilla.org/toolkit/app-startup;1'].
      getService(Components.interfaces.nsIAppStartup);
    
    var quitSeverity = forced ? Components.interfaces.nsIAppStartup.eForceQuit :
                                Components.interfaces.nsIAppStartup.eAttemptQuit;

    appStartup.quit(quitSeverity);
};

// needs browser.dom.window.dump.enabled
function print(msg)
{
    dump(msg + '\n');
};

// print error to stdout and quit
function error(msg)
{
    print("RES: ERR " + msg);
    quit(true);
};

function setPassword()
{
    var hostname = "proxy.krdwrd.org:8080";
    var realm = "krdwrd Off-Line Proxy";
    var username = "krdwrd";
    var passwrd = "krdwrd";

    if ("@mozilla.org/passwordmanager;1" in Components.classes) {
       // Password Manager exists so this is not Firefox 3
        var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].
            getService(Components.interfaces.nsIPasswordManager);

        passwordManager.addUser(hostname + ' (' + realm + ')', username, passwrd);
    }
    else if ("@mozilla.org/login-manager;1" in Components.classes) {
        // Login Manager exists so this is Firefox 3
        hostname = 'moz-proxy://' + hostname;

        var passwordManager = Components.classes["@mozilla.org/login-manager;1"].
            getService(Components.interfaces.nsILoginManager);
    
        var logins = passwordManager.findLogins({}, hostname, null, realm);

        // login must not exist yet
        if (logins.length == 0)
        {
            var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                   Components.interfaces.nsILoginInfo, "init");

            var authLoginInfo = new nsLoginInfo(hostname, null, realm, username, passwrd, "", "");

            passwordManager.addLogin(authLoginInfo);
        }
    }
};

// create a new browser object load url, call onload on completion
function mkBrowser(url, onload)
{
    var browser = document.createElement('browser');

    browser.setAttribute('src', url);
    browser.setAttribute('height', 1);
    browser.setAttribute('width', 1);

    // need to append to a document to become available
    document.documentElement.appendChild(browser);

    // hook into onload
    browser.addProgressListener(progress_listener(onload));

    return browser;
};

function saveCanvas(canvas, dest)
{
      // convert string filepath to an nsIFile
      var file = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(dest);

      // create a data url from the canvas and then create URIs of the source and targets  
      var io = Components.classes["@mozilla.org/network/io-service;1"]
                         .getService(Components.interfaces.nsIIOService);
      var source = io.newURI(canvas.toDataURL("image/png", ""), "UTF8", null);
      var target = io.newFileURI(file)
    
      // prepare to save the canvas data
      var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                              .createInstance(Components.interfaces.nsIWebBrowserPersist);
  
      persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
      persist.persistFlags |= Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

      // save the canvas data to the file
      persist.saveURI(source, null, null, null, null, file);
};

function saveText(text, dest)
{
      // convert string filepath to an nsIFile
      var file = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(dest);

      // create output stream
      var ost = Components.classes["@mozilla.org/network/file-output-stream;1"].
                    createInstance(Components.interfaces.nsIFileOutputStream);
      ost.init(file, -1, -1, null);

      // write data & close
      ost.write(text, text.length);

      ost.flush();
};

function grabSource(doc)
{
    return doc.documentElement.innerHTML;
};

function grabRect(win, doc, x, y, w, h)
{
    // get references to the target canvas
    var canvas = doc.createElement('canvas');
    doc.documentElement.appendChild(canvas);

    canvas.width = w;
    canvas.height = h;

    // get a fresh drawing context
    var context = canvas.getContext('2d');

    // draw portion of window
    context.drawWindow(win, x, y, w, h, 'rgb(128,128,128);');
    return canvas;
};

function grabScreen(win, doc)
{
    // grab whole document
    return grabRect(win, doc, 0, 0, doc.width, doc.height);
};

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
              this.handler(doc, prog.DOMWindow);
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
