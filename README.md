# Product Speculation Sentence Coding — Certainty-Scale Experience-Boundary Variant

An alternative sentence-level human-validation exercise for four observable
decisions used to identify pre-release product speculation:

1. uncertainty cue or framing, elicited through a five-point certainty scale;
2. whether the uncertainty is related to the game;
3. whether the post includes a proposition or product-experience concern; and
4. one or more qualifying product topic domains.

The first decision asks how certain the user seems on a five-point scale. Ratings
1–4 are mapped silently to qualifying uncertainty, while 5 is mapped to stated
certainty. A sixth radio option records a pure request for information. Only
these three underlying response categories are saved; the individual 1–4 scale
positions do not become separate response categories. A rating from 1–4 must
then pass both the game-relation and proposition-or-experience decisions before
product-topic domains are shown. A negative answer at either decision is
broader uncertainty and does not qualify as PRUS.

The broader product-experience wording is bounded by the sampling frame: every
sentence was posted during the defined pre-release period. Future orientation
therefore comes from sample eligibility rather than requiring every sentence to
contain an explicit prediction or future-tense construction.

The site deliberately avoids asking participants to classify PRUS directly. A
question that only requests information has its own response option and is
retained distinctly in the saved record. The proposition and product-topic
decisions are unchanged from the preceding sentence-component exercise.

The two certainty-scale endpoint explanations are available from toggleable
question-mark controls so coders can consult them without keeping the full text
on screen. Step 2 uses “No (Or unclear)” for uncertainty that cannot clearly be
related to the game. Items are described explicitly as individual sentences
shown without the surrounding user-post context. These clarifications do not
change the response categories, derivation rule, sample version, storage prefix,
or private response namespace; previously completed v3 submissions remain valid.

## Data and storage

- `data/sample_sentences.json` contains the public 500-sentence exercise sample.
- Browser progress is retained locally for resume support.
- Secure checkpoints are sent to the shared Cloudflare Worker after every 25
  completed sentences, on Save & Exit, and at completion.
- Saved responses use the private
  `responses/sentence-validation-certainty-scale-experience-boundary-v3/` namespace.

The public sample contains no machine labels or sampling strata.
