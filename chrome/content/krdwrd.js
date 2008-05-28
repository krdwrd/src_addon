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
    }
                      );
}

// get krdwrd class tag
function getkwtag(klasses)
{
    return filterklass(klasses, function(klass)
    {
        return (klass.substring(10, 0) != "krdwrd-tag");
    }
                      );
}


function Tracker()
{
    this.tracked_class = null;
    this.tracked = null;

    // handle document's mousemove events
    doTrackEvent = function(event)
    {
        doTrack(event.target);
    };

    // update (un)selected element's css class names
    doTrack = function(tracked, tag_index)
    {
        // unhighlight old
        if (this.tracked)
        {
            if (tag_index)
                this.tracked_class = this.tracked.className =
                  filterkw(this.tracked_class) + " krdwrd-tag-" + tag_index;
            else
                this.tracked.className = this.tracked_class;
        }

        if (! $('kwmenu_track').hasAttribute('checked'))
            return false;

        // highlight new
        if (tracked)
        {
            this.tracked = tracked;
            this.tracked_class = tracked.className;
            tracked.className = "krdwrd-highlighted " + tracked.className;
        }
    };

    this.doTag = function(tag_index)
    {
        doTrack(null, tag_index);
    }

    this.startTracking = function()
    {
        content.document.addEventListener("mouseover", doTrackEvent, false);
    };

    this.stopTracking = function()
    {
        content.document.removeEventListener("mouseover", doTrackEvent, false);
        doTrack(null);
    };
};

/*
 * KrdWrd controller for the xul front-end
 */
function KrdWrd()
{
    kwserver = 'https://krdwrd.org/pages/bin/';
    corpus = 'test';

    // inject stylesheet into current document
    addStyle = function(doc, href)
    {
        var css = doc.createElement('link');
        css.rel = "stylesheet";
        css.type = "text/css";
        css.href = href;
        doc.documentElement.appendChild(css);
    };

    // get the current document's mouse tracker
    // fall back to creating new tracker only when 'create' is true
    getTracker = function(create)
    {
        var doc = content.document;
        if (! doc.tracker && create)
        {
            doc.tracker = new Tracker();
            addStyle(doc, "chrome://krdwrd/content/krdwrd.css");
        }
        return doc.tracker;
    }

    this.getCorpus = function()
    {
        return this.corpus;
    }

    // keyboard short cut handler: invert checkbox state
    this.onToggleTracking = function()
    {
        var track = $('kwmenu_track');
        if (track.hasAttribute('checked'))
            track.removeAttribute('checked');
        else
            track.setAttribute('checked', true);
        this.onCommandTracking();
    };

    // start / stop mouse tracking and set status image
    // all according to the tracking menu checkbox
    this.onCommandTracking = function()
    {
        if ($('kwmenu_track').hasAttribute('checked'))
        {
            $('kwcontext').hidden = false;
            getTracker(true).startTracking();
            $('krdwrd-panel').src = 'chrome://krdwrd/skin/kw-enabled.ico';
        }
        else
        {
            $('kwcontext').hidden = true;
            getTracker(false).stopTracking();
            $('krdwrd-panel').src = 'chrome://krdwrd/skin/kw-disabled.ico';
        }
    };

    notify = function(txt)
    {
        var nb = gBrowser.getNotificationBox();
        nb.appendNotification(txt, "default", null, 1);
    };

    // submit tagged html to server
    this.onCommandSubmit = function()
    {
        var html = encodeURIComponent(getHTML());
        var url = encodeURIComponent(content.document.location.href);
        var params = "url=" + url + "&html=" + html;
        var request = new XMLHttpRequest();
        var ocg = this.onCommandGrab();

        request.open('POST', kwserver + 'tagpage', true);
        request.onreadystatechange = function()
        {
            if (request.readyState == 4)
            {
                var response = request.responseText;
                if (request.status != 200)
                    notify("Upload failed. " + response);
                else
                {
                    notify("Upload complete.");
                    ocg();
                }
            }
        };
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.setRequestHeader('Content-Encoding', 'multipart/form-data')
        request.setRequestHeader("Content-length", params.length);
        request.send(params);
    };

    // grab page from corpus
    this.onCommandGrab = function()
    {
        content.document.location = kwserver + 'serve?corpus=' + this.getCorpus();
        $('kwmenu_track').setAttribute('checked', true);
        this.onCommandTracking();
    };

    // handler for user tag events
    this.onTag = function(tag_index)
    {
        var t;
        if (t = getTracker(false))
        {
            t.doTag(tag_index);
        }
    };

    // set current corpus
    this.setCorpus = function(corpus, label)
    {
        $('kwmenu_grab').label = "Grab from " + label;
        $('kwmenu_grab').disabled = false;
        $('kwmenu_submit').disabled = false;
        this.corpus = corpus;
        this.onCommandGrab();
    };

    // test for propagating krdwrd tags down to text nodes
    do_propagate = function(cb)
    {
        function rec(node, kw)
        {
            var cn = node.className;
            if (cn)
            {
                var tag = getkwtag(cn);
                if (tag) kw = tag;
                //node.className = filterkw(cn);
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
        var doc = content.document.body;
        rec(doc, "krdwrd-tag-2");
    };

    this.propagate = function()
    {
        do_propagate(function(node, kw) {
                node.parentNode.className = filterkw(node.parentNode.className) + " " + kw;
            });
    };

    // show window w/ annotated text
    this.text = function()
    {
        toggleSidebar('viewKwSidebar', true);
        var doc = $('sidebar').contentDocument;
        var sb = doc.getElementById('kwsbcontent');
        while (sb.hasChildNodes())
            sb.removeChild(sb.lastChild);
        do_propagate(function(node, kw){
                var div = doc.createElement('html:div');
                var span = doc.createElement('html:span');
                span.className = kw;
                var txt = doc.createTextNode(node.data);
                span.appendChild(txt);
                div.appendChild(span);
                sb.appendChild(div);
            });
    };

    // update per-document tracker when the current page changes
    document.addEventListener("pageshow", this.onCommandTracking, false);
    document.addEventListener("focus", this.onCommandTracking, false);

};

// Singleton
kw = new KrdWrd();

