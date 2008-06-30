/*
 * KrdWrd controller for the xul front-end
 */
function KrdWrd()
{
    this.kwserver = 'https://krdwrd.org/pages/bin/';
    this.corpus = 'test';
    this.is_tutorial = false;

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
    };

    this.getCorpus = function()
    {
        return this.corpus;
    };

    // keyboard short cut handler: invert checkbox state
    this.onToggleTracking = function()
    {
        var track = $('kwmenu_track');
        if (track.hasAttribute('checked'))
        {
            track.removeAttribute('checked');
        }
        else
        {
            track.setAttribute('checked', true);
        }
        this.onCommandTracking();
    };

    // start / stop mouse tracking and set status image
    // all according to the tracking menu checkbox
    this.onCommandTracking = function()
    {
        var checked = $('kwmenu_track').hasAttribute('checked');
        var tracker = getTracker(checked);

        if (checked)
        {
            tracker.startTracking();
            $('krdwrd-panel').src = 'chrome://krdwrd/skin/kw-enabled.ico';
        }
        else
        {
            if (tracker)
            {
                tracker.stopTracking();
            }
            $('krdwrd-panel').src = 'chrome://krdwrd/skin/kw-disabled.ico';
        }
    };

    this.notify = function(txt, buttons)
    {
        var nb = gBrowser.getNotificationBox();
        var priority = nb.PRIORITY_INFO_MEDIUM;
        return nb.appendNotification(txt, "default", 'chrome://krdwrd/skin/kw-enabled.ico', priority, buttons);
    };

    this.doValidate = function()
    {
        var self = this;

        var waiter = this.notify("Validating ..."); 

        var taglist = "";
        traverse(content.document.body, function(node, kw)
        {
            taglist += kw.split("-")[2] + " ";
        });

        var url = 'url=' + encodeURIComponent(content.document.location.href);
        var tags = 'tags=' + encodeURIComponent(taglist);
        var params = url + "&" + tags;

        post_request(this.kwserver + 'validate', params, function(response, stat)
        {
            waiter.close();
            if (stat != 200)
            {
                self.notify("Validation failed. " + response);
            }
            else
            {
                var lst = response.split(" ");
                var i = 0;

                traverse(content.document.body, function(node, kw)
                {
                    node.parentNode.className = filterkw(node.parentNode.className) +
                        "krdwrd-tag-" + lst[i++];
                });

                var btns = [{ callback: function() { self.onCommandGrab(); }, 
                    label: 'Next Page', accessKey: 'n'}];

                self.notify("Check validation results and continue to ...", btns); 
            }
        });
    };

    // submit tagged html to server
    this.onCommandSubmit = function()
    {
        var self = this;

        var track = $('kwmenu_track');
        if (track.hasAttribute('checked'))
        {
            track.removeAttribute('checked');
            this.onCommandTracking();
        }

        var url = 'url=' + encodeURIComponent(content.document.location.href);
        var html = 'html=' + encodeURIComponent(getHTML());
        var params = url + "&" + html;

        post_request(this.kwserver + 'tagpage', params, function(response, stat)
        {
            if (stat != 200)
            {
                self.notify("Upload failed. " + response);
            }
            else
            {
                if (self.is_tutorial)
                {
                    self.doValidate();
                }
                else
                {
                    self.notify("Upload complete.");
                    self.onCommandGrab();
                }
            }
        });
    };

    // grab page from corpus
    this.onCommandGrab = function()
    {
        // inject proxy settings, login, password
        kwProxy();

        content.document.location = this.kwserver + 'serve?' + 
            'corpus=' + this.corpus +
            (this.is_tutorial ? '&serial=true' : '');
        $('kwmenu_track').setAttribute('checked', true);
        this.onCommandTracking();
    };

    // handler for user tag events
    this.onTag = function(tag_index)
    {
        var t = getTracker(false);
        if (t)
        {
            t.doTrack(null, tag_index);
        }
    };

    // set current corpus
    this.setCorpus = function(corpus, label)
    {
        $('kwmenu_grab').label = "Grab from " + label;
        $('kwmenu_grab').setAttribute('disabled', false);
        $('kwmenu_submit').setAttribute('disabled', false);
        this.corpus = corpus;
        this.is_tutorial = corpus == 'tutorial';
        this.onCommandGrab();
    };

    this.propagate = function()
    {
        var body = content.document.tracker.tracked || content.document.body;
        traverse(body, function(node, kw) {
                node.parentNode.className = filterkw(node.parentNode.className) + " " + kw;
            });
    };

    // show window w/ annotated text
    this.text = function()
    {
        var doc = $('kwsbcontent').contentDocument;
        var sb = doc.getElementById("content");

        while (sb.hasChildNodes())
        {
            sb.removeChild(sb.lastChild);
        }

        traverse(content.document.body, function(node, kw){
                var txt = doc.createTextNode(node.data);
                var span = doc.createElement('div');
                span.appendChild(txt);
                span.className = kw + " kwsb-tag";
                sb.appendChild(span);
            });
    };

    this.updatetext = function(caller)
    {
        var style = "";
        for (var i = 1; i < 4; i++)
        {
            if (! $('show' + i).getAttribute('checked'))
            {
                style = style + " krdwrd-hidden-" + i; 
            }
        }
        $('kwsbcontent').contentDocument.body.className = style;
    };

    this.updateContext = function()
    {
        // strip the /bin part
        var kws = this.kwserver.substr(0, this.kwserver.length-4);
        var loc = "" + content.document.location;
        var iskw = (loc.substr(0, kws.length) != kws);
        $('kwmenu_submit').setAttribute('disabled', iskw);
    };

    this.insertKW = function()
    {
        kwtext(content.document);
    };

    // update per-document tracker when the current page changes
    document.addEventListener("pageshow", this.onCommandTracking, false);
    document.addEventListener("focus", this.onCommandTracking, false);

    // block tracking when popup is active
    $('contentAreaContextMenu').addEventListener("popupshowing", function() {
            if ($('kwmenu_track').hasAttribute('checked'))
            {
                $('kwcontext').removeAttribute('hidden');
            }
            else
            {
                $('kwcontext').setAttribute('hidden', true);
            }
            content.document.blocked = true;
        }, false);
    $('contentAreaContextMenu').addEventListener("popuphiding", function() {
            content.document.blocked = false;}, false);

}

var kw = null;

window.addEventListener("load", function()
{
    // Singleton
    kw = new KrdWrd();
}, false);

// vim: et
