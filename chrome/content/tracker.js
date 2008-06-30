function Tracker()
{
    this.tracked_class = null;
    this.tracked = null;
}


// handle document's mousemove events
Tracker.prototype._doTrackEvent =
    function(event)
    {
        var src = event.target;
        if (src == content.document.documentElement)
            src = src.body;
        this.doTrack(src);
    };

// update (un)selected element's css class names
Tracker.prototype.doTrack =
    function(tracked, tag_index)
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
        this.listen = function (e) { 
            if (! content.document.blocked)
                self._doTrackEvent(e);
        };
        content.document.addEventListener("mouseover", this.listen, false);
    };

Tracker.prototype.stopTracking =
    function()
    {
        this.doTrack(null, null);
        content.document.removeEventListener("mouseover", this.listen, false);
    };

// vim: et
