function Tracker()
{
    this.tracked_class = null;
    this.tracked = null;
    this.listen = null;
    this.lasttag = 0;
}


// handle document's mousemove events
Tracker.prototype._doTrackEvent =
    function(event)
    {
        var src = event.target;
        var type = event.type;

        if (type == 'mouseover')
        {
            if (src == content.document.documentElement)
                src = src.body;

            this.doTrack(src);
        }
        else if (type == 'click' && event.button == 0)
        {
            // a 'click' event will trigger a node for tagging: either
            //  - with the same tag the last node was tagged
            //  - with the 'next' tag in the sequence of tags
            //  - or with the default tag

            // the default tag to use
            tag_index = 1;
            // get the tag of the 'current' node
            curti = parseInt(getkwtagnum(this.tracked_class));

            if (curti > 0 && curti == this.lasttag)
                tag_index = (( curti + 1) % 3 ) + 1;
                // tag_index = ( (curti-1) % 3 ) == 0 ? 3 : (curti+2) % 3;
            else if (this.lasttag > 0)
                tag_index = this.lasttag;

            this.lasttag = tag_index;
            this.doTrack(null, tag_index);
        }

    };

// update (un)selected element's css class names
Tracker.prototype.doTrack =
    function(tracked, tag_index)
    {
        // unhighlight old
        if (this.tracked)
        {
            if (tag_index == "none")
                this.tracked_class = this.tracked.className =
                    filterkw(this.tracked_class).trim();
            else if (tag_index)
                this.tracked_class = this.tracked.className =
                    (filterkw(this.tracked_class) + " krdwrd-tag-" + tag_index).trim();
            else
                this.tracked.className = this.tracked_class;
        }

        if (! tag_index)
            this.tracked = tracked;

        // highlight new
        if (tracked)
        {
            this.tracked_class = tracked.className;
            tracked.className = "krdwrd-highlighted " + tracked.className;
        }
    };

Tracker.prototype.startTracking =
    function()
    {
        var self = this;
        if (this.listen)
            return;
        this.listen = function (e) { 
            if (! content.document.blocked)
                self._doTrackEvent(e);
        };
        content.document.addEventListener("mouseover", this.listen, false);
        content.document.addEventListener("click", this.listen, false);
    };

Tracker.prototype.stopTracking =
    function()
    {
        this.doTrack(null, null);
        content.document.removeEventListener("click", this.listen, false);
        content.document.removeEventListener("mouseover", this.listen, false);
        this.listen = null;
    };

// vim: et
