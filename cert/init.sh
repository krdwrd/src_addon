#!/bin/sh

# init cert database
certutil -N -d .

# import keys (server certs, pub/priv keypair)
pk12util -v -i ~/cert/krdwrd@krdwrd.org.p12 -n krdwrd -d .

# import cacert.org ca root
test -f class3.der || wget http://www.cacert.org/certs/class3.der
md5sum -c class3.der.md5 && certutil -A -i class3.der -n "CAcert Class 3 Root - Root CA" -t CT,C,C -d .

# export public key in base64 format
openssl pkcs12 -in ~/cert/krdwrd@krdwrd.org.p12 -nokeys -clcerts -out public.pem
openssl x509 -in public.pem -inform pem -out pub.der -outform der
base64-encode < pub.der > pub.base64
