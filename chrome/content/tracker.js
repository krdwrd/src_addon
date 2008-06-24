function Tracker()
{
    this.tracked_class = null;
    this.tracked = null;
}

Tracker.prototype.tracked_class;
Tracker.prototype.tracked;

// handle document's mousemove events
Tracker.prototype._doTrackEvent =
    function(event)
    {
        var src = event.target;
        if (src == content.document.documentElement)
            src = src.body;
        doTrack(src);
    };

// update (un)selected element's css class names
Tracker.prototype._doTrack =
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

Tracker.prototype.doTag =
    function(tag_index)
    {
        this._doTrack(null, tag_index);
    };

Tracker.prototype.startTracking =
    function()
    {
        content.document.addEventListener("mouseover", this._doTrackEvent, false);
    };

Tracker.prototype.stopTracking =
    function()
    {
        content.document.removeEventListener("mouseover", this._doTrackEvent, false);
        this._doTrack(null);
    };

