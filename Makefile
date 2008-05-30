XPI=krdwrd.xpi
EXTR=krdwrd@krdwrd.org
HASH=$(XPI).hash
REV=.REV
em:version="0.0.56"
TAGVER=sed -i 's/em:version="[^"]*"/em:version="0.0.'`cat .REV`'"/'
TXTVER=sed -i 's/version: 0.0.[0-9]\+/version: 0.0.'`cat .REV`'/'
HASHVER=sed -i 's/em:updateHash="[^"]*"/em:updateHash="sha512:'`cat $(HASH)`'\"/'

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

update.rdf: $(XPI)
	$(TAGVER) update.rdf
	sha512sum $(XPI) | awk '{ print $$1; }' > $(HASH)
	$(HASHVER) update.rdf
	
skin: $(REV)
	$(TXTVER) chrome/skin/about

$(XPI): install.rdf skin
	zip $(XPI) chrome.manifest install.rdf -r chrome -x '*/.*'

clean:
	rm -f $(XPI) $(HASH) $(REV)
	rm -rf $(EXTR)

sign: update.rdf
	rm -rf $(EXTR) || true
	mkdir $(EXTR)
	unzip $(XPI) -d $(EXTR)
	signtool -k krdwrd@krdwrd.org -d cert -X -Z $(XPI) $(EXTR) || rm -rf $(XPI) $(EXTR)

release: sign

