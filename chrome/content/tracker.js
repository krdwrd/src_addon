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

Tracker.prototype.startTracking =
    function()
    {
		var self = this;
        content.document.addEventListener("mouseover", function (e) { self._doTrackEvent(e); }, false);
    };

Tracker.prototype.stopTracking =
    function()
    {
        content.document.removeEventListener("mouseover", this._doTrackEvent, false);
        this._doTrack(null);
    };

