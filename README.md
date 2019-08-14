# KrdWrd

The KrdWrd Project ran from 2008 to 2011. The mission statement was
> Provide tools and infrastructure for acquisition, visual annotation, merging and storage of web pages as parts of bigger corpora.
>
> Develop a classification engine that learns to automatically annotate pages, and provide visual tools for inspection of results.

Basically, it was an infrastructure for research into web page cleaning. A good
overview can be found in the paper and an extensive description in the master's thesis (both, see [further down](#cite-work)).

## Remnants

1. The **annotation guidelines** and the **Firefox add-on manual** are still
available [online](https://krdwrd.github.io/manual) and as [pdf
file](https://github.com/krdwrd/manual/releases/download/20100831/manual.pdf).

2. The **CANOLA Corpus**


## System Components

The system consisted of
- [Firefox Add-on](https://github.com/krdwrd/krdwrd.github.io/wiki/AddOn) for
  interactive visual annotation and retrieval of tagging results
- [XULRunner
  application](https://github.com/krdwrd/krdwrd.github.io/wiki/XulRunner) for
  batch processing of web pages
- [Web Proxy](https://github.com/krdwrd/krdwrd.github.io/wiki/WebProxy) and
  additional server-side infrastructure for providing access to corpora and
  storing annotation results
- Server-side Machine Learning infrastructure for experiments with cleaning models


This is the Firefox Add-on.
