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

// traverse the dom, call cb on text nodes
function traverse(body, cb, defaulttag)
{
    function rec(node, kw)
    {
        var cn = node.className;
        if (cn)
        {
            var tag = getkwtag(cn);
            if (tag) 
            {
                kw = tag.replace(' ', '');
            }
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
            if (cnode.nodeName != "SCRIPT")
                rec(cnode, kw);
        }
    };
    rec(body, defaulttag || "krdwrd-tag-2");
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
    prefs.setIntPref("network.proxy.type", 1);
    prefs.setCharPref("network.proxy.no_proxies_on", "localhost, krdwrd.org");
    
}

function setProxyType(proxytype)
{
    var prefs = getPref();

    prefs.setIntPref("network.proxy.type", proxytype);
}

// set the proxy password
function setPassword(hostname, realm, username, passwrd)
{
    try
    {
        hostname = 'moz-proxy://' + hostname;

        var passwordManager = Components.classes["@mozilla.org/login-manager;1"].
                              getService(Components.interfaces.nsILoginManager);

        var logins = passwordManager.findLogins( {}, hostname, null, realm);

        // login must not exist yet
        if (logins.length == 0)
        {
            var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                    Components.interfaces.nsILoginInfo, "init");

            var authLoginInfo = new nsLoginInfo(hostname, null, realm, username, passwrd, "", "");

            passwordManager.addLogin(authLoginInfo);
        }
    }
    catch(ex) 
    {
        // This will only happen if there is no Login Manager - and this should /not/ happen!
    }
}

function kwProxy()
{
    var hostname = "proxy.krdwrd.org";
    var port = 8080;
    var realm = "krdwrd Off-Line Proxy";
    var username = "krdwrd";
    var passwrd = "krdwrd";

    if (typeof(KrdWrdApp) != 'undefined' && KrdWrdApp.param.proxyenv != false)
    {
        print("PXY: proxy settings from ENV");
        setProxyType(5);
    } 
    else if (! haveProxy(hostname))
    {
        saveProxy();
        setProxy(hostname, port);
    }

    setPassword(hostname + ":" + port, realm, username, passwrd);
}

// vim: et
