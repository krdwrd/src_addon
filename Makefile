XPI=krdwrd.xpi
REV=.REV
TAGVER=sed -i 's/\(<em:version>\).*\(<\/em:version>\)/\10.0.'`cat .REV`'\2/'
TXTVER=sed -i 's/\(Version: \).*\( @ svn\)/\10.0.'`cat .REV`'\2/'
HASHVER=sed -i 's/\(em:updateHash=\"\).*/\1sha512:'`cat $(XPI).hash`'\"/'
DEPLOY=/srv/www/projects/krdwrd/addon/

default: $(XPI)

is-clean:
	test -z "`svn st -q 2>&1 | head -n1`"
	svn update

tag-revision:
	svn info | sed -n -e 's/^Last Changed Rev: \(.*\)$$/\1/p' > REV
	diff REV $(REV) 2> /dev/null || cp REV $(REV)
	rm REV

install.rdf: $(REV)
	$(TAGVER) install.rdf

update.rdf: install.rdf
	$(TAGVER) update.rdf
	$(HASHVER) update.rdf
	
skin: $(REV)
	$(TXTVER) chrome/skin/about

tag: is-clean tag-revision skin update.rdf

$(XPI):
	zip $(XPI) chrome.manifest install.rdf -r chrome -x '*/.*'
	sha512sum $(XPI) | cut -d ' ' -f 1 > $(XPI).hash 

clean:
	rm -f $(XPI) $(XPI).hash $(REV)

deploy: $(XPI)
	cp install.rdf update.rdf $(XPI) $(DEPLOY)
