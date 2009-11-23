XPI=krdwrd.xpi
TRUNK=krdwrd_trunk.xpi
EXTR=krdwrd@krdwrd.org
HASH=$(XPI).hash
REV=.REV
UPDATE=http://krdwrd.org/addon/krdwrd.xpi 
MAJOR=0.2
TAGVER=sed -i 's/em:version="[^"]*"/em:version="'$(MAJOR)'.'`cat .REV`'"/'
TXTVER=sed -i 's/version: 0.[0-9]\+.[0-9]\+/version: '$(MAJOR)'.'`cat .REV`'/'
HASHVER=sed -i 's/<em:updateHash>[^>]*<\/em:updateHash>/<em:updateHash>sha512:'`cat $(HASH)`'<\/em:updateHash>/'

default: release

is-clean:
	test -z "`svn st -q 2>&1 | head -n1`" || echo "WARNING: NO CLEAN CHECKOUT"

tag-revision:
	svn info | sed -n -e 's/^Last Changed Rev: \(.*\)$$/\1/p' > REV
	diff REV $(REV) 2> /dev/null || cp REV $(REV)
	rm REV

$(REV): is-clean tag-revision

install.rdf: $(REV)
	$(TAGVER) install.rdf

$(HASH): sign
	sha512sum $(XPI) | awk '{ print $$1; }' > $(HASH)

update.rdf.in: $(XPI) $(HASH) sign
	$(HASHVER) update.rdf.in
	
skin: $(REV)
	$(TXTVER) chrome/skin/about

$(XPI): install.rdf skin
	zip $(XPI) chrome.manifest install.rdf -r chrome defaults -x '*/.*'

$(TRUNK): install.rdf skin
	zip $(TRUNK) chrome.manifest install.rdf -r chrome defaults -x '*/.*'

clean:
	rm -f $(XPI) $(HASH) $(REV) update.rdf
	rm -rf $(EXTR)

sign: $(XPI)
	rm -rf $(EXTR) || true
	mkdir $(EXTR)
	unzip $(XPI) -d $(EXTR)
	rm $(XPI)
	signtool -k krdwrd@krdwrd.org -d cert -X -Z $(XPI) $(EXTR) || rm -rf $(XPI) $(EXTR)

trunk: $(TRUNK)
	rm -rf $(EXTR) || true
	mkdir $(EXTR)
	unzip $(TRUNK) -d $(EXTR)
	rm $(TRUNK)
	signtool -k krdwrd@krdwrd.org -d cert -X -Z $(TRUNK) $(EXTR) || rm -rf $(TRUNK) $(EXTR)

update.rdf: update.rdf.in sign
	spock/spock update.rdf.in -i urn:mozilla:extension:krdwrd@krdwrd.org -v $(MAJOR).`cat $(REV)` -u $(UPDATE) -d cert > update.rdf

release: clean update.rdf

