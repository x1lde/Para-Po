# ParaPo! — Codebase & Q&A Pocket Guide

Short explanations and ready-to-say answers for presentation practice.
Based on the implementation and bundled model results reviewed on **10 October 2026**.

## Jump to what you need

- [30-second introduction](#30-second-introduction)
- [Numbers to remember](#numbers-to-remember)
- [How the app works](#how-the-app-works)
- [Where the code lives](#where-the-code-lives)
- [Likely Q&A](#likely-qa)
- [Limits and future work](#limits-and-future-work)
- [Last-minute reminders](#last-minute-reminders)

## 30-second introduction

> ParaPo! helps commuters travel between familiar Makati landmarks. It uses an on-device AI model to recognize the starting landmark and bundled transport data to suggest journeys. Users can also choose landmarks manually, so recognition and GPS are optional.

**Problem:** You recognize the building nearby, but you do not know which ride to take.

**What ParaPo! does:** Connects that landmark to walking, boarding, riding, and alighting guidance.

## Numbers to remember

- **14** supported Makati landmarks.
- **15** model categories: 14 landmarks plus `other`.
- **31** distinct transport routes used by recommendations.
- **182** directional journeys: 14 starting places × 13 other destinations.
- **224 × 224** pixels: the image size sent to the model.
- **About 6 MB:** the bundled TensorFlow Lite model.
- **0.83:** the model's confidence threshold.

**Accuracy on 172 held-out photos:**

- **80.2%:** the first guess was correct.
- **90.7%:** the correct answer appeared among the top three guesses.
- **58.7%:** photos receiving an answer above the threshold.
- **96.0%:** those high-confidence answers were correct — 97 out of 101.

Say: **“High-confidence answers were 96% correct on held-out photos, covering about 59% of the photos.”**

Across the broader set of 1,091 real test images, including video frames, high-confidence answers were **93.5%** correct. These are dataset results; they do not establish accuracy on a physical phone.

## How the app works

1. **Choose a starting point.** Scan a landmark, select it manually, or use optional GPS on the native map screen.
2. **Choose a destination.** Pick another supported landmark.
3. **Look up saved journeys.** The app retrieves prepared walking, direct-ride, or one-transfer options.
4. **Read the instructions.** See estimated time, walking distance, boarding and alighting points, and route sources.
5. **View the map.** The mobile map draws available ride geometry. Its background needs internet.

Think of the app as three parts:

- **Eyes:** the AI recognizes a landmark in a photo.
- **Guidebook:** bundled data describes travel options.
- **Screen:** the interface presents the options and instructions.

### What happens to a photo?

The app loads the model, crops and resizes the photo, checks for unusable brightness or detail, runs inference, then matches the predicted label to a landmark.

**Inference** means running the trained model on a new image.

A high-confidence result fills the starting landmark. The user can change it. An uncertain result offers candidate landmarks and manual selection. Failures also retain manual selection.

### What happens when a journey is requested?

`planJourney(originId, destinationId)` retrieves options from the bundled journey JSON. Think of it as opening the correct page in a guidebook.

The heavier preparation happens beforehand in `tools/transit/build_journeys.py`. It considers travel direction, boarding access, walking, direct rides, and journeys with one transfer. It sorts options by estimated time and writes the data shipped with the app.

**SQLite and journey JSON have different jobs.** SQLite supports the local landmark catalog and reference transport lookups, including matching model labels to landmarks. The active all-pairs journey planner reads JSON directly.

## Where the code lives

- [`src/app/`](../src/app/) — Home, Camera, Map, Guide, and Progress screens. Expo Router connects the screens.
- [`src/components/commute/`](../src/components/commute/) — shared cards, buttons, navigation, branding, and themes.
- [`src/features/recognition/`](../src/features/recognition/) — camera and AI recognition logic.
- [`src/features/transport/planner/`](../src/features/transport/planner/) — saved journey data and lookup functions.
- [`src/features/maps/`](../src/features/maps/) — markers and available route paths.
- [`src/features/location/`](../src/features/location/) — optional foreground GPS.
- [`src/database/`](../src/database/) — local SQLite schema, bundled catalog, and database access.
- [`assets/models/`](../assets/models/) — the model packaged inside the app.
- [`ml/`](../ml/) — Python data collection, training, and evaluation.
- [`tools/transit/`](../tools/transit/) — journey data preparation.

**Why separate these?** Each part has a clear responsibility. The team can improve recognition without rewriting the planner.

### Files worth knowing

- [`LandmarkCamera.tsx`](../src/features/recognition/components/LandmarkCamera.tsx): handles camera permission, capture, results, and starting-point selection.
- [`recognition-service.native.ts`](../src/features/recognition/services/recognition-service.native.ts): loads and runs the model, validates results, and finds matching landmarks.
- [`preprocess.ts`](../src/features/recognition/services/preprocess.ts): prepares image pixels and rejects unusable frames.
- [`journey-planner.ts`](../src/features/transport/planner/journey-planner.ts): retrieves saved journey options.
- [`build_journeys.py`](../tools/transit/build_journeys.py): generates those options before release.
- [`train.py`](../ml/train.py): trains, evaluates, and exports the landmark model.

Files ending in `.native.tsx` or `.native.ts` provide mobile-specific behavior. `.web.tsx` and `.web.ts` provide web-specific behavior.

## Likely Q&A

### 1. What exactly does the AI recognize?

> It classifies photos into 14 supported Makati landmarks, plus an `other` category. It does not currently identify vehicles or read their signboards.

### 2. What model did you use, and why?

> We use MobileNetV3-Large with transfer learning, exported to TensorFlow Lite. The exported model is about 6 MB, making it practical to package in a mobile app.

**Transfer learning:** adapting a model that already learned general image features to recognize our landmarks.

### 3. How accurate is it?

> The first guess was correct on about 80% of held-out photos. Answers above our confidence threshold were 96% correct, but covered about 59% of those photos. Physical-phone accuracy still needs evaluation.

### 4. Why is the confidence threshold 0.83?

> It was selected using validation data to prioritize reliable answers. Below the threshold, the app offers candidates and manual selection.

**Confidence is a model score.** A score of 0.83 does not guarantee an individual prediction has an 83% chance of being correct.

### 5. What happens if recognition is wrong or fails?

> Users can change the suggested starting point or choose a landmark manually. A failed scan does not block journey planning.

The current camera screen automatically fills a high-confidence starting landmark. There is no separate confirmation button required for every result.

### 6. Can a photo on another phone fool the model?

> Yes. The model recognizes visual content and does not verify physical presence. A landmark shown on a screen may be recognized.

Rejecting blank or dark photos does **not** establish liveness or prevent photo spoofing.

### 7. Where did the training images come from?

> We use 6,361 curated images from web photos, Wikimedia Commons, and video frames. Training adds 500 synthetic negative images, such as blank colors and noise, to help reject meaningless input.

Source and licensing records are retained. An image being publicly accessible does not automatically permit redistribution.

### 8. How did you separate training and testing?

> We keep related images from the same source in one split and group near-duplicates. For example, frames from one video stay together, reducing leakage between training and testing.

The intended split is roughly **70% training, 15% validation, and 15% testing**. Whole-source grouping affects exact counts.

**Training:** learns the landmarks. **Validation:** helps select settings. **Testing:** measures the final model on held-out data.

### 9. Does the AI calculate the best route?

> The AI identifies the starting landmark. A separate rules-based process prepares travel options, and the phone retrieves them from saved data.

The current phone planner does not run a live shortest-path search or an AI route optimizer.

### 10. Why are there 182 journeys?

> Each of the 14 landmarks can connect to the other 13: 14 × 13 = 182 directional pairs. A to B and B to A count separately because travel direction matters.

### 11. Where does the route data come from?

> Most comes from OpenStreetMap. The Circuit Makati–One Ayala P2P connection comes from a published report. Ride options include their source references.

Community data may be incomplete or outdated. Having a saved option does not prove that the team has field-tested it.

### 12. Does the whole app work offline?

> Mobile recognition, manual selection, and bundled journey instructions work offline. The interactive map background needs internet.

Offline map downloads are not implemented.

### 13. Are times and distances exact?

> They are estimates based on assumed walking speed, ride speed, and typical waiting time. Walking distance is approximated from straight-line distance.

There is no live traffic, actual vehicle arrival tracking, exact indoor walking-path calculation, or complete fare dataset.

### 14. Why use GPS if you have landmark recognition?

> They provide different ways to choose a starting point. Recognition uses a photo, GPS finds a nearby supported landmark, and manual selection works without either.

The native map only automatically selects a nearest landmark within **1.5 km**. GPS is user-initiated and stops after success, cancellation, failure, or timeout.

### 15. Are photos uploaded? Are users tracked continuously?

> Recognition runs locally without uploading photos to a recognition server. GPS is foreground-only and requested by the user.

Online maps still contact their provider. Do not claim the entire app never makes network requests.

### 16. Is the web version the same as the mobile app?

> The web version supports manual journey planning and a landmark overview map. Photo recognition is unavailable on web. The native journey map adds GPS and available ride paths.

### 17. How did you test the app?

> We use lint and TypeScript checks, automated logic checks, and held-out model evaluation. Mocked native checks help verify application logic, but do not replace testing the camera, inference, or maps on a physical phone.

Lint and TypeScript checks passed during this codebase review. That does not establish device performance or field accuracy.

### 18. What would you improve next?

> We would collect more real phone photos, test on Android and iOS devices, verify journeys in the field, and establish a repeatable route-data refresh process.

## Limits and future work

- **Coverage:** currently 14 Makati landmarks.
- **Recognition:** some landmark classes have few held-out photos and weaker results.
- **Device testing:** camera behavior, inference speed, and native-map performance still need physical-device validation as of this review.
- **Transport:** saved source-based recommendations, without live service confirmation.
- **Maps:** online background; no offline download feature.
- **Progress:** the screen exists, but points, streaks, badges, and completed-trip tracking are not connected.
- **Spoofing:** no screen detection or physical-presence verification.

## Last-minute reminders

Remember these five distinctions:

1. **Landmarks vs. vehicles:** the AI recognizes landmarks.
2. **Confidence vs. accuracy:** model scores and measured correctness are different.
3. **Recognition vs. planning:** the AI chooses a place; saved data supplies journeys.
4. **Offline guidance vs. online maps:** instructions work offline; the map background needs internet.
5. **Implemented vs. planned:** progress tracking and physical-device validation remain future work.

If you do not have evidence for a claim, say: **“That has not been validated yet; it is part of our next evaluation.”**

## Evidence and deeper reading

- [Main project README](../README.md)
- [Model training and evaluation](../ml/README.md)
- [Bundled model metrics](../assets/models/landmark_model.json)
- [Recognition implementation notes](recognition.md)
- [Journey data sources and preparation](data/transit-routes.md)

Update this guide when the model, route coverage, or validation status changes.
