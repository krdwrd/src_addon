#!/bin/sh

# init cert database
certutil -N -d .

# import keys (server certs, pub/priv keypair)
pk12util -v -i ~/cert/krdwrd@krdwrd.org.p12 -n krdwrd -d .
