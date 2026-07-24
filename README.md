# Product Speculation Sentence Coding

A sentence-level human-validation exercise for three observable components of
pre-release product speculation:

1. uncertainty cue or framing;
2. an uncertain proposition; and
3. one or more qualifying product topic domains.

The site deliberately avoids asking participants to classify the theoretical
construct directly. A question that only requests information has its own
response option and is retained distinctly in the saved record.

## Data and storage

- `data/sample_sentences.json` contains the public 500-sentence exercise sample.
- Browser progress is retained locally for resume support.
- Secure checkpoints are sent to the shared Cloudflare Worker.
- Saved responses use the private
  `responses/sentence-validation-component-first-v1/` namespace.

The public sample contains no machine labels or sampling strata.
