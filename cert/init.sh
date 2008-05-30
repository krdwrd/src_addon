#!/bin/sh

# init cert database
certutil -N -d .

# import keys (server certs, pub/priv keypair)
pk12util -v -i krdwrd@krdwrd.org.p12 -n krdwrd -d .

# import cacert.org ca root
wget http://www.cacert.org/certs/class3.crt
certutil -A -i class3.crt -n cacert.org -t C,C,C -d .
