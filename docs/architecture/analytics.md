# Visitor analytics (proposal)

**Status: proposed.** Nothing here is approved yet. Issue
[#347](https://github.com/mmiri-oma/mmirioma/issues/347) asks whether to
measure website visits at all; no analytics tool is added by this issue. It
becomes approved when a reviewer who is not the author fills in the approval
block in section 8.

**Author:** @nnamdi-security + agent · **Written:** 3 November 2026 · **Prices
and terms checked:** 3 November 2026 (section 9 lists each source).

## 1. Recommendation

**Do not add visitor analytics for the pilot.** Close #347 with that decision.

- The pilot's questions are about orders, not visits. The PRD's pilot metrics
  (§3.3) are live deliveries, the workflow, on-time rate, price transparency,
  unloading, cost capture and customer feedback. None needs page views.
- The order-side questions, "which areas and which vehicle types do orders come
  from", are answered by the admin reports (#333, with a chosen date range),
  from the orders themselves and with no cookie.
- The owner has said there is no budget, and every hosted option below costs
  money or sends visitor data to another company.
- The privacy notice promises "We do not use analytics or advertising cookies"
  (section 13). Choosing no analytics keeps that sentence true, and needs no
  banner and no notice change.
- A decision to add analytics later is cheap to make. Nothing now closes it off.

## 2. What analytics would add, and what it would not

| Question | Answered today by | Needs visitor analytics? |
| --- | --- | --- |
| Where do orders come from (area, vehicle type)? | Admin reports, #333 | No |
| How many orders, how many delivered, cancelled? | Dashboard and reports | No |
| How many people open the landing page, and from which link? | Nothing | Yes |
| Do visitors reach the order page and leave? | Nothing (orders placed are counted, not abandoned visits) | Yes |

The two unanswered questions are marketing questions. The pilot is a small
launch: the PRD asks for at least one real delivery (§1, §3.3) in a pilot
neighbourhood that is still an open decision (§13). With so few customers, the
team can simply ask each one how they heard of MmiriOma. Revisit when a real question exists that the orders cannot answer.

## 3. Options

| | A: none | B: hosted, cookieless (Plausible) | C: hosted, cookieless (GoatCounter) | D: self-hosted (Umami) | E: cookie-based (for example Google Analytics) |
| --- | --- | --- | --- | --- | --- |
| Monthly cost | $0 | $9 for up to 10,000 pageviews (Starter); 30-day free trial; no free plan | Free for non-commercial use only; the price for a business site was not confirmed (sources disagree) | $0 licence, but a Node app and a PostgreSQL database to run on our server | Not researched |
| New infrastructure | None | A script from another company | A script from another company | A new service and database on the 4 GB VPS | A script from another company |
| What leaves the site | Nothing | Each visit's page, referrer, browser and IP, to the provider (hosted in the EU, per its site) | The same, to the provider | Nothing leaves our server | The same, usually to a US company |
| Cookies | None | None, per its site | None, per its README | None, per its docs | Yes |
| Consent banner needed? | No | Disputed: see section 4 | Disputed: see section 4 | Disputed: see section 4 | Yes |
| Fits the $0 budget | Yes | No | Only if "non-commercial" applies, which is doubtful for a business | Money no, but it uses memory the OSRM decision needs | Not priced |
| How it fails | Not applicable | Script blocked or provider down: no numbers; the site works | Same | Our outage; an unpatched service on the same server | Same as B |

Notes on the figures: Plausible's price and "no cookies" claim are from its
own site. GoatCounter's and Umami's are from their README and documentation as
shown in search results; Umami's hosted free tier and prices were not confirmed
from its own site. Nothing was bought or tested.

## 4. The legal question

Nigeria's Data Protection Commission issued the General Application and
Implementation Directive (GAID) 2025 (NDPC/NDP ACT-GAID/01/2025). I read
Article 19 ("Consent to Cookies and other Tracking Tools") in the PDF:

- (2) "the use of cookies on a website or other digital platforms requires consent",
  except as the GAID provides.
- (5) and (6): "necessary cookies" (core functions such as security, network
  stability management and accessibility) need no ticked box. "All other forms of
  cookies" need a specific "accept" or "reject" choice.
- (7): the banner must be conspicuous, seen before scrolling, with the purpose,
  the organisation responsible and how to withdraw.
- **(8): the Commission treats "any personal data tracking tool which performs
  functions that are similar to cookies" as bound by the same rules.**

What this means for us:

- The **sign-in cookie** is a necessary cookie; the notice already says so.
- Option E needs a banner.
- Options B to D say "no cookies", but Article 19(8) may still treat a tool that
  recognises a returning visitor, even without a cookie, as a cookie-like tracking
  tool. Whether a cookieless counter that stores no identifier falls outside
  Article 8 is **not settled by anything I found**. This is my reading, not legal
  advice. A Nigerian legal or data-protection adviser would have to say.
- That uncertainty is a cost of B to D that option A does not have.

The map tiles on the landing page (#346) are not cookies or a tracking tool: the
visitor's browser asks OpenFreeMap for map tiles, and the notice names the
provider (section 7). That is a disclosure, not an analytics tool.

## 5. If analytics is chosen later

Each of these would be its own issue, with an owner and a reviewer:

1. A budget decision (B costs money; D costs server memory).
2. The legal basis, confirmed by the adviser, including whether a cookieless tool
   needs consent under Article 19(8).
3. If consent is needed: a banner design approved at G2 (conspicuous, accept and
   reject, shown before scrolling), and a test that nothing loads before the choice.
4. `PRIVACY_NOTICE.md` section 13 and section 7 (the provider), the `/privacy`
   page, and a retention row in section 8.
5. The script loaded only after consent, with a content-security note in the
   deployment guide.
6. Which numbers staff actually read, so the tool is not installed to sit unused.

## 6. What this decision changes

Nothing in the code, the notice or the deployment. #347 closes with the reason
"not needed for the pilot; see `docs/architecture/analytics.md`". The notice's
sentence in section 13 stays true.

## 7. Open questions

1. Is there a marketing question the team needs answered during the pilot that
   asking customers would not answer? If yes, name it and reopen this.
2. Who is the Nigerian legal or data-protection adviser (privacy-retention.md,
   "Open items", item 1), and can they answer the Article 19(8) question when they
   review the notice?

## 8. Approval

Both blocks are empty on purpose. A reviewer who is not the author fills them in.

```text
Reviewer (not the author):   <GitHub username>
Date:                        <date>
Decision:                    <none for the pilot | change: ...>
Conditions or changes:       <text>
```

## 9. Sources

Checked on 3 November 2026. Prices change; confirm before paying.

| Fact | Source |
| --- | --- |
| Plausible plans, price, free trial, "no cookies", EU hosting | https://plausible.io/#pricing (the official page) |
| GoatCounter: free for non-commercial use, cookieless hash, self-hosting | its README, as shown in search results; the price for commercial use was not confirmed |
| Umami: cookieless, PostgreSQL, free hosted plan | its documentation as shown in search results; the hosted prices and limits were not confirmed |
| Cookies and tracking tools, Article 19 | NDPC, GAID 2025: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf (text read from the PDF) |
| Pilot metrics | `MmiriOma_MVP_PRD.md` §3.3 |
| Current notice sentence | `PRIVACY_NOTICE.md` section 13 |

**Not verified:** Google Analytics' current terms and any price; GoatCounter's
commercial price; Umami's hosted terms; how the Commission applies Article 19(8)
to a cookieless counter.
