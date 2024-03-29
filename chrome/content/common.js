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
    if (!klasses || !klasses.split) return '';
    var l = klasses.split(" ");
    res = "";
    for (i in l)
    {
        if (filter(l[i])) continue;
        res += l[i] + " ";
    }
    return res;
}

// convenience string trim function
String.prototype.trim = function () {
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

String.prototype.btelen = function () {
    return this.trim().replace( /\n/g, " ")
        .replace(/  +/g, " ").split(/\s/).length;
};

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
        // "kw-t-none" can happen after tag/tag-remove action
        return (klass.substring(15,0) == "krdwrd-tag-none" 
            || klass.substring(10, 0) != "krdwrd-tag");
        // return (klass.substring(10, 0) != "krdwrd-tag");
    }).trim();
}

// get krdwrd class tag number
function getkwtagnum(klasses)
{
    return (getkwtag(klasses))?getkwtag(klasses).substring(11):"";
}

// remove all krdwrd-* tags from node and silblings
function clearkw(node)
{
    if (node.className)
    {
        node.className = filterkw(node.className);
    }
    for (child in node.childNodes)
    {
        clearkw(node.childNodes[child]);
    }
}

// check for nodes we do /not/ want to traverse.
// common place for often-used check 
function recursehere(node)
{
    return (node != undefined && 
        node.nodeName != "SCRIPT" &&
        node.nodeName != "STYLE" &&
        node.nodeName != "#comment")
}

// returns true for 'interrupting' white space nodes 
function wsNode(node)
{
    var nn = String(node.nodeName);

    return (nn == "P" ||
        nn == "DIV" ||
        nn == "BR" ||
        nn == "BLOCKQUOTE" ||
        nn == "DL" ||
        nn == "UL" ||
        nn == "OL" ||
        nn == "LI" ||
        nn == "TR" ||
        nn == "TH" ||
        nn == "TD" ||
        nn == "TABLE" ||
        nn == "OPTION" ||
        nn == "PRE" ||
        nn == "H1" ||
        nn == "H2" ||
        nn == "H3" ||
        nn == "H4" ||
        nn == "H5" ||
        nn == "H6");
}

// traverse the dom, call cb on text nodes
function traverse(body, cb, defaulttag)
{
    function rec(node, kw)
    {
        if (node) 
        {
            var cn = node.className;
            if (cn)
            {
                var tag = getkwtag(cn);
                if (tag) 
                    kw = tag;
            }
            if (node.nodeName == "#text")
            {
                var tx = node.data.replace( /^\s+/g, "").replace( /\s+$/g, "").replace( /\n/g, " ").replace(/  +/g, " ");
                if (tx)
                    cb(node, kw, tx);
            }
            for (child in node.childNodes)
            {
                cnode = node.childNodes[child];
                if (recursehere(cnode))
                    rec(cnode, kw);
            }
        }
    };
    rec(body, defaulttag || "krdwrd-tag-1");
}


// insert kw tags around text blocks
function kwtext(doc, start)
{
    var nodes = [];
    traverse(start || doc, function(node, kw)
    {
        nodes[nodes.length] = node;
    });
    // need to separate collect & append so we dont disturb traversal
    for (var n in nodes)
    {
        node = nodes[n];
        var p = node.parentNode;
        var txt = doc.createTextNode(node.data);
        node.data = "";
        var span = doc.createElement('kw');
        span.appendChild(txt);
        p.insertBefore(span, node);
    }
}


function extractTags(doc)
{
    var res = '';
    f = function (n, t, txt) { res += t[11] + "\n"; };
    traverse(doc, f);
    return res;
}


// filter out any node with node.nodeName is nName within doc
function filterNodes(doc, nName)
{
    try {
        var nodeIterator = document.createNodeIterator(  
            doc,  
            NodeFilter.SHOW_ELEMENT,  
            { acceptNode: function(nd) 
                { 
                    if (nd.nodeName == nName) return NodeFilter.FILTER_ACCEPT;
                    else return NodeFilter.FILTER_REJECT; 
                } 
            },  
            false  
        );  
           
        for (var currentNode; currentNode = nodeIterator.nextNode();) {  
            pn = currentNode.parentNode;
            if (pn)
                pn.removeChild(currentNode);
        } 
    } 
    catch (err)
    {
        // well, avoid NS_ERROR_DOM_NOT_SUPPORTED_ERR: Operation is not supported
        // ...and just do nothing.
    }
}

// https://developer.mozilla.org/en-US/docs/How_to_Quit_a_XUL_Application
// quit the application
function quit(forced)
{
    var appStartup = Components.classes['@mozilla.org/toolkit/app-startup;1'].
                     getService(Components.interfaces.nsIAppStartup);

    var quitSeverity = forced ? Components.interfaces.nsIAppStartup.eForceQuit :
                       Components.interfaces.nsIAppStartup.eAttemptQuit;

    appStartup.quit(quitSeverity);
}

// needs browser.dom.window.dump.enabled
function print(msg)
{
    dump(msg + '\n');
}

// print error to stdout and quit
function error(msg)
{
    print("RES: ERR " + msg);
    quit(true);
}

// print debug messages - only when verbose
function verbose(msg)
{
    if (KrdWrdApp.param.verbose)
        print("VRB: "+msg);
}

// returns details about exception e as string
function format_exception(e)
{
    return e.name + ": " + e.message + "\nStack:\n" + e.stack;
}

function getPref()
{
    return Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefBranch);
}

function saveProxy()
{
    var prefs = getPref();

    try
    {
        prefs.setCharPref("krdwrd.proxy.http",
            prefs.getCharPref("network.proxy.http"));
        prefs.setIntPref("krdwrd.proxy.http_port",
            prefs.getIntPref("network.proxy.http_port"));
        prefs.setCharPref("krdwrd.proxy.https",
            prefs.getCharPref("network.proxy.https"));
        prefs.setIntPref("krdwrd.proxy.https_port",
            prefs.getIntPref("network.proxy.https_port"));
        prefs.setBoolPref("krdwrd.negotiate-auth.allow-proxies",
            prefs.getBoolPref("network.negotiate-auth.allow-proxies"));
        prefs.setBoolPref("krdwrd.proxy.share_proxy_settings",
            prefs.getBoolPref("network.proxy.share_proxy_settings"));
        prefs.setIntPref("krdwrd.proxy.type",
            prefs.getIntPref("network.proxy.type"));
        prefs.setCharPref("krdwrd.proxy.no_proxies_on",
            prefs.getCharPref("network.proxy.no_proxies_on", "krdwrd.org"));
    }
    catch (e)
    { // fail silently 
    }
}

function restoreProxy()
{
    var prefs = getPref();

    try 
    {
        prefs.setCharPref("network.proxy.http",
            prefs.getCharPref("krdwrd.proxy.http"));
        prefs.setIntPref("network.proxy.http_port",
            prefs.getIntPref("krdwrd.proxy.http_port"));
        prefs.setCharPref("network.proxy.https",
            prefs.getCharPref("krdwrd.proxy.https"));
        prefs.setIntPref("network.proxy.https_port",
            prefs.getIntPref("krdwrd.proxy.https_port"));
        prefs.setBoolPref("network.negotiate-auth.allow-proxies",
            prefs.getBoolPref("krdwrd.negotiate-auth.allow-proxies"));
        prefs.setBoolPref("network.proxy.share_proxy_settings",
            prefs.getBoolPref("krdwrd.proxy.share_proxy_settings"));
        prefs.setIntPref("network.proxy.type",
            prefs.getIntPref("krdwrd.proxy.type"));
        prefs.setCharPref("network.proxy.no_proxies_on",
            prefs.getCharPref("krdwrd.proxy.no_proxies_on", "krdwrd.org"));
    }
    catch (e)
    { // fail silently 
    }
}

function haveProxy(hostname)
{
    var prefs = getPref();
    try
    {
        return prefs.getCharPref("network.proxy.http") == hostname;
    }
    catch (e)
    {
        return false;
    }
}

function setProxy(hostname, port)
{
    var prefs = getPref();

    prefs.setCharPref("network.proxy.http", hostname);
    prefs.setIntPref("network.proxy.http_port", port);
    prefs.setCharPref("network.proxy.https", hostname);
    prefs.setIntPref("network.proxy.https_port", port);
    prefs.setBoolPref("network.negotiate-auth.allow-proxies", true);
    prefs.setBoolPref("network.proxy.share_proxy_settings", true);
    prefs.setCharPref("network.proxy.no_proxies_on", "localhost");

    setProxyType(1);
}

function setProxyType(proxytype)
{
    var prefs = getPref();

    prefs.setIntPref("network.proxy.type", proxytype);
}

function kwProxy()
{
    if (typeof(KrdWrdApp) != 'undefined' && KrdWrdApp.param.proxy != null)
    {
        var p = KrdWrdApp.param.proxy.toString();
        port = p.substr(p.lastIndexOf(':')+1);
        p = p.substr(0,p.lastIndexOf(':'));
        hostname = p.lastIndexOf('@') == -1?p:p.substr(p.lastIndexOf('@')+1);
        p = p.lastIndexOf('@') == -1?p:p.substr(0,p.lastIndexOf('@'));
        
        if (hostname && port)
        {
            setProxy(hostname, port);
            print("OPT: proxy set to '"+hostname+"','"+port+"'");
        }
        else
        {
            setProxyType(0);
            print("OPT: proxy disabled");
        }
    } 
    else 
    {
        var hostname = "proxy.krdwrd.org";
        var hostnamealt = "proxy2.krdwrd.org"; // alt way to access the proxy on port:993
        var port = 8080;
        
        if (! haveProxy(hostname) && ! haveProxy(hostnamealt))
        {
            saveProxy();
            setProxy(hostname, port);
        }
    }
}

// vim: et
