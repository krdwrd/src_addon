MAJOR=0.2
REV=.REV

ifeq ($(findstring release,$(MAKECMDGOALS)),release)
XPI=krdwrd.xpi
UPDATE=update.rdf
VER := $(MAJOR).$(shell cat $(REV))
else
XPI=krdwrd_trunk.xpi
UPDATE=update_trunk.rdf
VER := $(MAJOR).$(shell cat $(REV))trunk
endif

UPDATEURL := http://krdwrd.org/addon/$(UPDATE)
XPIURL := http://krdwrd.org/addon/$(XPI)
INSTALL=install.rdf
HASH=$(XPI).hash
EXTR=krdwrd@krdwrd.org

TAGVER=sed -i 's/^[[:space:]]\+<em:version>.*<\/em:version>/        <em:version>$(VER)<\/em:version>/'
TXTVER=sed -i 's/version: [0-2].[0-9]\+.[0-9]\+\(trunk\)\?/version: $(VER)/'
HASHVER=sed -i 's/<em:updateHash>[^>]*<\/em:updateHash>/<em:updateHash>sha512:'`cat $(HASH)`'<\/em:updateHash>/'
UPDATEVER=sed -i 's@^[[:space:]]\+<em:updateURL>.*</em:updateURL>@        <em:updateURL>$(UPDATEURL)</em:updateURL>@'

default: trunk 

is-clean:
	test -z "`svn st -q 2>&1 | head -n1`" || echo "WARNING: NO CLEAN CHECKOUT"

tag-revision:
	svn info | sed -n -e 's/^Last Changed Rev: \(.*\)$$/\1/p' > REV
	diff REV $(REV) 2> /dev/null || cp REV $(REV)
	rm REV

$(REV): is-clean tag-revision

install.rdf: $(REV)
	$(TAGVER) $(INSTALL) 
	$(UPDATEVER) $(INSTALL)

$(HASH): sign
	sha512sum $(XPI) | awk '{ print $$1; }' > $(HASH)

update.rdf.in: $(XPI) $(HASH) sign
	$(HASHVER) update.rdf.in
	
skin: $(REV)
	$(TXTVER) chrome/skin/about

$(XPI): $(INSTALL) skin
	zip $(XPI) chrome.manifest $(INSTALL) icon.png -r chrome defaults -x '*/.*'

clean:
	rm -f $(XPI) $(HASH) $(REV) $(UPDATE)
	rm -rf $(EXTR)

sign: $(XPI)
	rm -rf $(EXTR) || true
	mkdir $(EXTR)
	unzip $(XPI) -d $(EXTR)
	rm $(XPI)
	signtool -k krdwrd@krdwrd.org -d cert -X -Z $(XPI) $(EXTR) || rm -rf $(XPI) $(EXTR)

$(UPDATE): update.rdf.in sign
	spock/spock update.rdf.in -i urn:mozilla:extension:krdwrd@krdwrd.org -v $(VER) -u $(XPIURL) -d cert > $(UPDATE)

release: clean $(UPDATE)

trunk: clean $(UPDATE)

# vim:noexpandtab:
