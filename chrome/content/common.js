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

// returns details about exception e as string
function format_exception(e)
{
	return e.name + ": " + e.message + "\nStack:\n" + e.stack;
};

function setProxy(hostname, port)
{
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].
		getService(Components.interfaces.nsIPrefBranch);

	prefs.setCharPref("network.proxy.http", hostname);
	prefs.setIntPref ("network.proxy.http_port", port);
	prefs.setBoolPref("network.negotiate-auth.allow-proxies", true);
	prefs.setBoolPref("network.proxy.share_proxy_settings", true);
	prefs.setIntPref ("network.proxy.type", 1);

	prefs.setCharPref("network.proxy.no_proxies_on", "krdwrd.org");
};

// set the proxy password
function setPassword(hostname, realm, username, passwrd)
{

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

function kwProxy()
{
    var hostname = "proxy.krdwrd.org";
    var port = 8080;
    var realm = "krdwrd Off-Line Proxy";
    var username = "krdwrd";
    var passwrd = "krdwrd";

    setProxy(hostname, port);
    setPassword(hostname + ":" + port, realm, username, passwrd);
};

