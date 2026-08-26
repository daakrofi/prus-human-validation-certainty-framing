# Product Speculation Sentence Coding — Certainty-Framing Variant

An alternative sentence-level human-validation exercise for three observable
components of pre-release product speculation:

1. uncertainty cue or framing, elicited through a certainty check;
2. an uncertain proposition; and
3. one or more qualifying product topic domains.

The first decision is phrased as whether the user presents the sentence as
certain knowledge. A sentence that leaves room for doubt is coded as qualifying
uncertainty. This is an instruction variant of the existing component-first
site, not a replacement for it.

The site deliberately avoids asking participants to classify PRUS directly. A
question that only requests information has its own response option and is
retained distinctly in the saved record. The proposition and product-topic
decisions are unchanged from the preceding sentence-component exercise.

## Data and storage

- `data/sample_sentences.json` contains the public 500-sentence exercise sample.
- Browser progress is retained locally for resume support.
- Secure checkpoints are sent to the shared Cloudflare Worker.
- Saved responses use the private
  `responses/sentence-validation-certainty-framing-v1/` namespace.

The public sample contains no machine labels or sampling strata.
