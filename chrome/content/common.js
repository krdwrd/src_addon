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


function extractText(doc, withtags)
{
    var res = '';
    if (withtags)
    {
        f = function (n, t, txt) { res += t[t.length-1] + " " + txt + "\n"; };
    } else
    {
        f = function (n, t, txt) { res += txt + "\n"; };
    }
    traverse(doc, f);
    return res;
}


function extractViz(doc)
{
    var res = '';
    props = ['offsetHeight', 'offsetLeft', 'offsetTop', 'offsetWidth', 'scrollHeight', 'scrollWidth'];
    fl = 20;

    function nn2id(str)
    {
        if (typeof(str) != 'string')
            return -1
        // crude hash for strings
        hasch = 0;
        for (i = 0; i < 4, i < str.length; i++)
           hasch += str.charCodeAt(0) * Math.pow(2, 7 * i);
        return hasch;
    }

    function rec(node, paren)
    {
        // extract features
        r = [];
        if ((node.nodeName == "#text") &&
            node.data.replace( /^\s+/g, "").replace( /\s+$/g, "").replace( /\n/g, " ").replace(/  +/g, " "))
        {
            for (p = 0; p < parn.length, p < pl; p++)
                r[r.length] = paren[p];
            if (p == pl)
                r[r.length-1] = 0;
            for (p = r.length; p<fl; p++)
                r[r.length] = -1;
            for (p in props)
                r[r.length] = node.parentNode[props[p]];
            r[r.length] = paren.length;
            r[r.length] = node.childNodes.length;
            if (node.previousSilbling)
                print("PREV\n");
            res += r.join(' ') + "\n";
        }
        // recurse to children
        paren[paren.length] = nn2id(node.nodeName);
        for (child in node.childNodes)
        {
            cnode = node.childNodes[child];
            if (cnode.nodeName != "SCRIPT")
                rec(cnode, paren);
        }
    };
    rec(doc, []);

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
    prefs.setBoolPref("network.negotiate-auth.allow-proxies", true);
    prefs.setBoolPref("network.proxy.share_proxy_settings", true);
    prefs.setIntPref("network.proxy.type", 1);
    prefs.setCharPref("network.proxy.no_proxies_on", "krdwrd.org");
}

// set the proxy password
function setPassword(hostname, realm, username, passwrd)
{

    if ("@mozilla.org/passwordmanager;1" in Components.classes)
    {
        // Password Manager exists so this is not Firefox 3
        var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].
                              getService(Components.interfaces.nsIPasswordManager);

        passwordManager.addUser(hostname + ' (' + realm + ')', username, passwrd);
    }
    else if ("@mozilla.org/login-manager;1" in Components.classes)
    {
        // Login Manager exists so this is Firefox 3
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
}

function kwProxy()
{
    var hostname = "proxy.krdwrd.org";
    var port = 8080;
    var realm = "krdwrd Off-Line Proxy";
    var username = "krdwrd";
    var passwrd = "krdwrd";

    if (! haveProxy(hostname))
    {
        saveProxy();
        setProxy(hostname, port);
    }

    setPassword(hostname + ":" + port, realm, username, passwrd);
}

// vim: et
