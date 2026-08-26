# Product Speculation Sentence Coding — Certainty-Scale Variant

An alternative sentence-level human-validation exercise for three observable
components of pre-release product speculation:

1. uncertainty cue or framing, elicited through a five-point certainty scale;
2. an uncertain proposition; and
3. one or more qualifying product topic domains.

The first decision asks how certain the user seems on a five-point scale. Ratings
1–4 are mapped silently to qualifying uncertainty, while 5 is mapped to stated
certainty. A sixth radio option records a pure request for information. Only
these three underlying response categories are saved; the individual 1–4 scale
positions do not become separate response categories.

The site deliberately avoids asking participants to classify PRUS directly. A
question that only requests information has its own response option and is
retained distinctly in the saved record. The proposition and product-topic
decisions are unchanged from the preceding sentence-component exercise.

## Data and storage

- `data/sample_sentences.json` contains the public 500-sentence exercise sample.
- Browser progress is retained locally for resume support.
- Secure checkpoints are sent to the shared Cloudflare Worker.
- Saved responses use the private
  `responses/sentence-validation-certainty-scale-v1/` namespace.

The public sample contains no machine labels or sampling strata.
