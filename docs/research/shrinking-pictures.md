# Shrinking a picture on the device

Research for the optional picture on a recipe. A recipe has at most one picture. It shows in the recipe's header and full-size on screen, and it goes everywhere the recipe goes: every device's copy, the Drive folder, JSON export and the standalone page. Rosa holds the picture itself, so it should shrink each picture on the device when the user adds it.

This page answers one question: how can a browser turn a picture the user picks, or takes with a phone's camera, into a small file fit for the header and for full-size viewing?

It was written in November 2026. The current browsers then were Chrome 158, Firefox 160 and Safari 27.2 ([MDN browser-compat-data 8.1.10](https://github.com/mdn/browser-compat-data/releases/tag/v8.1.10)). Version numbers below come from that data unless another source is named.

## Summary

These are facts and options, not a decision.

- **Every browser Rosa runs in can do the whole job with built-in APIs, off the main thread.** A worker can decode the file with `createImageBitmap`, resize it, draw it on an `OffscreenCanvas` and encode it with `convertToBlob`. All of this works in current Chrome, Firefox and Safari. The last piece to arrive was `OffscreenCanvas` in Safari 16.4.
- **JPEG is the only format all of them can encode.** Chrome and Firefox also encode WebP. Safari does not: it quietly returns a PNG instead, which is far larger. No browser is known to encode AVIF. AVIF needs a WebAssembly encoder, about 0.8 MB to download, and it took 3.6–7.6 seconds per 2048-pixel picture in my test.
- **HEIC is the hard case.** Safari 17+ decodes HEIC. Chrome and Firefox do not, on any platform. Safari on iOS hands a web page a JPEG when the user picks from the photo library or takes a photo, so most iPhone photos arrive as JPEG. HEIC still reaches Rosa from the iOS Files app, from a Mac, from Android phones set to save HEIF, and from photos copied off an iPhone to a desktop. Rosa can refuse such files with a message, or decode them with a WebAssembly HEIC decoder (about 0.36 MB with Brotli, roughly 1.6 seconds per 12-megapixel photo).
- **Rotation is handled.** All three browsers apply the EXIF orientation when they decode, so the pixels come out upright. Re-encoding through a canvas drops all metadata, including EXIF orientation and GPS location.
- **A sensible size is 2048 pixels on the longest side.** That fills a 1440p screen with a 4:3 photo at full detail. 2560 pixels covers most laptop "Retina" screens too.
- **Typical sizes for a 12-megapixel phone photo** (median of 7 photos, see [Realistic sizes](#3-realistic-sizes)). The originals were about 3 MB.
  - 2048 pixels, JPEG at quality 0.8: about 410 KB (290–690 KB).
  - 1200 pixels (header only), JPEG at 0.8: about 185 KB (125–285 KB).
  - At the same quality as that JPEG, WebP is 12–29% smaller at 2048 pixels and AVIF 34–47% smaller. The spread comes from the quality measure used (SSIM or PSNR).
- **Speed is fine in a worker.** The test CPU has about the single-core speed of a current mid-range Android phone. On it, turning a 12-megapixel JPEG into a 2048-pixel JPEG took 0.26–0.34 seconds in a worker, with no long tasks on the main thread. Doing the same on the main thread blocked it for 113–362 ms at a stretch.

One pipeline that follows from these facts:

1. `<input type="file" accept="image/*">`. On iOS this offers the photo library, the camera and the Files app. On Android, Chrome shows the photo picker, which lists existing photos. A second control with `capture="environment"` lets Android users take a photo.
2. Send the `File` to a module worker.
3. `createImageBitmap(file)`. If it rejects, the browser cannot decode the file (HEIC in Chrome or Firefox). Show a message, or fall back to a WebAssembly decoder.
4. Work out the target size from the bitmap's width and height, then `createImageBitmap(bitmap, { resizeWidth, resizeHeight, resizeQuality: 'high' })`.
5. Draw the result on an `OffscreenCanvas` and call `convertToBlob({ type: 'image/jpeg', quality: 0.8 })`. Optionally ask for `image/webp` first and keep it only if `blob.type` is `image/webp`.
6. Check `blob.type`, then store the blob.

## 1. Reading phone photos

### 1.1 What the file picker hands over

| Where the picture comes from             | What the page receives                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Safari on iOS, "Photo Library"           | A JPEG made by iOS, even when the photo is stored as HEIC (by default; see below)                            |
| Safari on iOS, "Take Photo" or `capture` | A JPEG that WebKit encodes at quality 0.8, named `image.jpg`                                                 |
| Safari on iOS, "Choose File" (Files app) | The file as it is. Can be HEIC                                                                               |
| Safari on macOS                          | The file as it is with `accept="image/*"`. With a list of specific types, HEIC is converted to the first one |
| Chrome on Android, photo picker          | The file as it is. Can be HEIC or an Ultra HDR JPEG                                                          |
| Chrome on Android, `capture`             | Whatever the camera app writes                                                                               |
| Chrome and Firefox on desktop            | The file as it is                                                                                            |

The sources for each row follow.

**Safari on iOS.** With `accept="image/*"` and no `capture`, Safari offers a menu with "Photo Library", "Take Photo" and "Choose File" ([WKFileUploadPanel.mm, lines 710–734](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L710-L734)).

- For the photo library, WebKit opens Apple's photo picker (`PHPicker`). It asks for the "compatible" representation unless an internal setting asks for the original format ([WKFileUploadPanel.mm, lines 690–705](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L690-L705), [WKContentViewInteraction.mm, lines 9897–9901](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebKit/UIProcess/ios/WKContentViewInteraction.mm#L9897-L9901)). That setting, `PhotoPickerPrefersOriginalImageFormat`, is internal and off by default ([UnifiedWebPreferences.yaml, lines 5044–5051](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml#L5044-L5051)). Apple describes "compatible" as "the most compatible asset representation" ([Apple](https://developer.apple.com/documentation/photosui/phpickerconfigurationassetrepresentationmode)). Apple's HEIF page says the more compatible format for photos is JPEG ([Apple](https://support.apple.com/en-us/116944)). So iOS turns a HEIC photo into a JPEG before the page sees it.
- A comment in that code says WebKit means to switch to the original format and decide on conversion from the `accept` attribute instead (FIXME 270470, same lines). Rosa should not depend on getting JPEG from the photo library forever.
- A photo taken with the camera has no file. WebKit encodes it as JPEG at quality 0.8 and names it `image.jpg` ([lines 1291–1312 and 1342–1362](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L1291-L1362)).
- A file from the Files app is copied as it is ([lines 1018–1043](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm#L1018-L1043)). Photos saved there from the Photos app can be HEIC.
- I had no iPhone to test on. These rows come from WebKit's current source, not from a run on a device.

**Safari on macOS.** Safari converts a picked image only when the `accept` attribute names specific types and the file is not one of them. It converts the file to the first listed type it can encode. With `image/*` alone it converts nothing ([WebPageProxy.cpp, lines 15768–15790](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebKit/UIProcess/WebPageProxy.cpp#L15768-L15790), [ImageUtilitiesCG.cpp, lines 114–133](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebCore/platform/graphics/cg/ImageUtilitiesCG.cpp#L114-L133)). This code is macOS only. It was added in 2020 ([WebKit bug 212482](https://bugs.webkit.org/show_bug.cgi?id=212482)). A bug, fixed in WebKit in January 2026, made `accept="image/*,image/heic"` turn PNG and JPEG files into HEIC ([WebKit bug 303803](https://bugs.webkit.org/show_bug.cgi?id=303803)).

**Chrome on Android.** When `accept` lists only image types and there is no `capture`, Chrome opens Android's photo picker on Android 13 and later. It passes the `accept` types on as a filter ([SelectFileDialog.java, lines 737–751, 1643–1646 and 1708–1740](https://github.com/chromium/chromium/blob/55a8a8f81d0e538db536b75ce1f83d176a3a4e5c/ui/android/java/src/org/chromium/ui/base/SelectFileDialog.java#L737-L751)). The photo picker shows the user's existing photos ([Android](https://developer.android.com/training/data-storage/shared/photopicker)). It converts HDR video for apps that ask, but it does not convert images. With `capture`, Chrome starts the camera app directly ([lines 575–590 and 638–639](https://github.com/chromium/chromium/blob/55a8a8f81d0e538db536b75ce1f83d176a3a4e5c/ui/android/java/src/org/chromium/ui/base/SelectFileDialog.java#L575-L590)). The camera app decides the file format.

**`capture` on other browsers.** `capture` works in Chrome on Android, Firefox on Android 79+ and Safari on iOS. Desktop browsers ignore it ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture)). The spec calls it a hint about which camera to use ([HTML Media Capture](https://www.w3.org/TR/html-media-capture/)).

### 1.2 HEIC

**Who can decode it.** Safari 17+ on macOS and iOS decodes HEIC ([WebKit](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)). Chrome and Firefox do not, on any platform ([browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/mediatypes/image/heif.json), [Chromium issue 411125808](https://crbug.com/411125808), [Firefox bug 1402293](https://bugzil.la/1402293)). In Chrome 151, `createImageBitmap` on a HEIC file rejects with `InvalidStateError: The source image could not be decoded.` (my test).

**Lockdown Mode.** When an Apple device is in Lockdown Mode, WebKit decodes only JPEG, PNG, GIF and WebP ([UTIRegistry.mm, lines 113–130](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebCore/platform/graphics/cg/UTIRegistry.mm#L113-L130)). HEIC and AVIF do not decode there. So a picture stored as AVIF would not show on such a device.

**Where HEIC still comes from.**

- The iOS Files app, as above.
- A Mac. Photos exported or copied from an iPhone can stay HEIC. Apple notes that importing can keep the original format ([Apple](https://support.apple.com/en-us/116944)).
- Android phones. Some cameras can save HEIF; Samsung's has a "High efficiency pictures" option. Chrome cannot decode these.
- Desktop Chrome or Firefox, with any HEIC file the user has.

**Telling a HEIC file apart.** `File.type` is not reliable. In Chrome, a file named `IMG_0001.HEIC` built in the page had an empty `type` (my test). The type the picker gives depends on the operating system. Two reliable signals: `createImageBitmap` rejects, or the file starts with an ISO-BMFF `ftyp` box whose brand is `heic`, `heix` or `mif1`.

**Options for HEIC in Chrome and Firefox.**

- Refuse it, and tell the user to pick a JPEG or change the camera setting.
- Decode it with a WebAssembly build of libheif. The `libheif-js` package (LGPL-3.0) has a 1.46 MB `.wasm` file, 0.36 MB with Brotli. In a worker in Chrome, it decoded a 1280×854 HEIC in about 150 ms, roughly 135 ms per megapixel. That suggests about 1.6 seconds for a 12-megapixel photo (my test; scaled up, not measured at full size).
- Use the macOS Safari conversion: list specific types in `accept`, without HEIC. This only helps Safari on macOS, which can decode HEIC anyway.

### 1.3 Other formats

- **JPEG** is what most phones write, and what iOS hands over.
- **Ultra HDR JPEG.** Android 14+ cameras can add an HDR "gain map" to a JPEG. Readers that do not understand it show the ordinary picture ([Android](https://developer.android.com/media/platform/hdr-image-format)). A canvas re-encode keeps the ordinary picture and drops the gain map.
- **PNG** screenshots, **WebP** and **GIF** decode everywhere. A GIF gives its first frame.
- **AVIF** decodes in Chrome 85+, Firefox 93+ and Safari 16.4+ (iOS 16.1+). It is Baseline "widely available" since July 2026 ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/avif/)).
- **JPEG XL** decodes in Safari 17+, Chrome 155+ and Firefox 158+.
- **Wide colour.** iPhone photos use the Display P3 colour space. A 2D canvas is sRGB by default, and colours outside sRGB are mapped into it ([HTML](https://html.spec.whatwg.org/multipage/canvas.html#colour-spaces-and-colour-correction)). Chrome 92+ and Safari 15.2+ can make a `display-p3` canvas. Firefox has it only behind a flag.
- **Bigger photos.** iPhone 15 and later take 24-megapixel photos by default, and can take 48 ([Apple](https://support.apple.com/en-mz/guide/iphone/aside/iph864de02ae/26/ios/26)). Decoding is the costly part: a decoded 12-megapixel picture takes about 48 MB of memory, a 24-megapixel one about 98 MB, a 48-megapixel one about 195 MB (4 bytes a pixel). On iOS, WebKit refuses a canvas larger than 8192×8192 pixels in area ([CanvasBase.cpp, lines 119–131](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebCore/html/CanvasBase.cpp#L119-L131)). That matters only if Rosa draws the picture at full size. Rosa's canvas is the target size.

### 1.4 EXIF rotation

Phones often store a photo sideways and add an EXIF "orientation" tag saying how to turn it.

- **CSS.** `image-orientation: from-image` is the initial value ([CSS Images 3](https://drafts.csswg.org/css-images-3/#the-image-orientation)). An `<img>` is shown upright in Chrome 81+, Firefox 76+ ([Firefox bug 1607667](https://bugzilla.mozilla.org/show_bug.cgi?id=1607667)) and Safari 13.1+ (iOS 13.4+). This is Baseline "widely available" since October 2022 ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/image-orientation/)).
- **`createImageBitmap`.** Its `imageOrientation` option defaults to `"from-image"`, which applies the EXIF orientation ([HTML](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#images-2)). Chrome 112+, Firefox 111+ and Safari 16+ support that value name. The spec notes that it used to be called `"none"`.
- **`drawImage` with an `<img>`.** The HTML spec does not say how `drawImage` treats EXIF orientation. Chrome draws the image upright (my test, below). Firefox began doing so in version 77 ([Firefox bug 1616169](https://bugzilla.mozilla.org/show_bug.cgi?id=1616169)). A 2020 comparison in [csswg-drafts issue 4666](https://github.com/w3c/csswg-drafts/issues/4666) lists Safari 13.1 using the image's own orientation as well. Decoding with `createImageBitmap` avoids relying on unspecified behaviour.
- **My test in Chrome 151.** I made an 800×600 JPEG with orientation 6 ("turn 90° clockwise") and a red block in the top-left corner. `img.naturalWidth`/`naturalHeight`, `createImageBitmap(blob)` in the page and in a worker, and `createImageBitmap` with `resizeWidth: 300` all gave a 600×800 (or 300×400) upright picture. `drawImage` of the `<img>` put the red block in the top-right corner, which is correct.
- **After re-encoding.** A canvas holds only pixels, so the new file has no EXIF data. The JPEG from Chrome's `toBlob` had no `Exif` segment (my test). The pixels are already upright, so losing the tag is correct. It also removes the GPS location that phone photos often carry.

## 2. Resizing and re-encoding in the browser

### 2.1 Decoding and resizing

`createImageBitmap(blob)` decodes a `File` or `Blob` and works in windows and in workers ([HTML](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#images-2)). Its resize options:

| Option                           | Chrome | Firefox | Safari |
| -------------------------------- | ------ | ------- | ------ |
| `resizeWidth`, `resizeHeight`    | 54     | 98      | 15     |
| `resizeQuality: 'high'`          | 54     | 149     | 15     |
| `imageOrientation: 'from-image'` | 112    | 111     | 16     |

If only one of `resizeWidth` and `resizeHeight` is given, the other keeps the aspect ratio ([HTML](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#images-2)). To cap the longest side, Rosa needs to know which side is longer. The simplest way is to decode at full size first, read `width` and `height`, then call `createImageBitmap(bitmap, { resizeWidth, resizeHeight, resizeQuality: 'high' })`.

The other way to resize is to draw the full-size bitmap onto a smaller canvas with `drawImage`. The canvas `imageSmoothingQuality` setting picks the filter, but Firefox does not support it ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingQuality)). `createImageBitmap` with `resizeQuality: 'high'` asks for a good filter in all three.

### 2.2 Encoding

`toBlob` (on `<canvas>`) and `convertToBlob` (on `OffscreenCanvas`) encode the canvas. The spec requires PNG. Other types are optional, and a browser that does not support the requested type must return a PNG instead ([HTML](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file)). It does not throw. So Rosa must check `blob.type`.

| Requested type | Chrome  | Firefox                                  | Safari                      |
| -------------- | ------- | ---------------------------------------- | --------------------------- |
| `image/jpeg`   | Yes     | Yes                                      | Yes                         |
| `image/webp`   | Yes     | Yes (`toBlob` 96+, `convertToBlob` 105+) | No, PNG                     |
| `image/avif`   | No, PNG | No, PNG                                  | Not documented; treat as no |

Sources:

- Chrome's encoder accepts only PNG, JPEG and WebP ([image_encoder_utils.cc, lines 37–49](https://github.com/chromium/chromium/blob/55a8a8f81d0e538db536b75ce1f83d176a3a4e5c/third_party/blink/renderer/platform/image-encoders/image_encoder_utils.cc#L37-L49)). In Chrome 151, asking for `image/avif`, `image/heic` or `image/jxl` gave `image/png` from both `toBlob` and `convertToBlob` (my test).
- Firefox has an open request for AVIF encoding and no encoder ([Firefox bug 1821907](https://bugzilla.mozilla.org/show_bug.cgi?id=1821907)).
- Safari encodes the types that Apple's ImageIO can write and WebKit can show ([MIMETypeRegistry.cpp, lines 469–483](https://github.com/WebKit/WebKit/blob/9c8b36b3a0e4471d812129ed895bb80a4544eb98/Source/WebCore/platform/MIMETypeRegistry.cpp#L469-L483)). WebP is not among them ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#browser_compatibility)). No source I found says Safari can encode AVIF from a canvas, and I could not test Safari.
- Every engine has its own JPEG encoder, so the same `quality` number gives different sizes in different browsers. My sizes are from Chrome.

To get WebP or AVIF everywhere, Rosa would need a WebAssembly encoder:

- AVIF: `@jsquash/avif` (Apache-2.0, libaom from Squoosh). The encoder is 3.49 MB, 0.84 MB with Brotli.
- WebP: `@jsquash/webp`. The encoder is 0.28 MB uncompressed.

### 2.3 OffscreenCanvas and workers

- `OffscreenCanvas` with a 2D context, and `convertToBlob`, work in Chrome 69+, Firefox 105+ and Safari 16.4+. It is Baseline "widely available" since September 2025 ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/offscreen-canvas/)).
- So the whole pipeline (decode, resize, encode) can run in a worker in every browser Rosa supports.
- In Chrome, `toBlob` on the main thread encodes JPEG and PNG in idle time on the main thread, a few rows at a time. It sends WebP to a background thread. `convertToBlob` in a worker encodes on the worker thread ([canvas_async_blob_creator.cc, lines 238–320](https://github.com/chromium/chromium/blob/55a8a8f81d0e538db536b75ce1f83d176a3a4e5c/third_party/blink/renderer/core/html/canvas/canvas_async_blob_creator.cc#L238-L320)).

## 3. Realistic sizes

### 3.1 How long a side

A 4:3 photo shown as large as the screen allows needs:

| Screen                          | Pixels needed at full detail |
| ------------------------------- | ---------------------------- |
| 1920×1080 monitor               | 1440×1080                    |
| 2560×1440 monitor               | 1920×1440                    |
| 14-inch MacBook Pro (3024×1964) | 2619×1964                    |
| 3840×2160 (4K) monitor          | 2880×2160                    |

So 2048 pixels on the longest side fills a 1440p monitor at full detail. 2560 pixels covers most laptop "Retina" screens. Only a 4K monitor would show more. On a phone, 2048 pixels is more than the screen holds.

For the header alone, 1200 pixels on the longest side fits a header up to 600 CSS pixels wide on a 2× screen.

### 3.2 Results

I measured this myself (see [Method](#method)). I took 7 camera JPEGs of food from Wikimedia Commons. All are 4032×3024 (12 megapixels), from iPhones and Samsung Galaxy phones. The originals are 2.2–4.3 MB, median 3.0 MB. Chrome 151 resized and encoded them in a worker. AVIF came from the `@jsquash/avif` WebAssembly encoder (libaom, speed 6, 4:2:0), since no browser encodes AVIF.

Sizes at the same quality number. KB here is 1,024 bytes. Each cell is the median of the 7 photos, with the smallest and largest in brackets.

| Longest side | JPEG 0.8         | WebP 0.8         | AVIF 60          |
| ------------ | ---------------- | ---------------- | ---------------- |
| 1200 px      | 184 KB (123–285) | 128 KB (78–242)  | 105 KB (56–203)  |
| 1600 px      | 284 KB (194–463) | 187 KB (114–372) | 153 KB (80–309)  |
| 2048 px      | 413 KB (288–690) | 258 KB (164–532) | 202 KB (107–427) |
| 2560 px      | 590 KB (430–996) | 345 KB (227–738) | 262 KB (144–578) |

The same number does not mean the same quality across formats. At 2048 pixels, WebP 0.8 and AVIF 60 lose more detail than JPEG 0.8. By SSIM they match a JPEG of about quality 0.7. So the table above flatters WebP and AVIF.

Sizes at the same quality as JPEG 0.8, found by matching SSIM (structural similarity to the resized original, computed at full resolution):

| Longest side | JPEG 0.8 | WebP (quality needed) | AVIF (quality needed) |
| ------------ | -------- | --------------------- | --------------------- |
| 1200 px      | 184 KB   | 142 KB, ×0.78 (0.81)  | 113 KB, ×0.61 (60)    |
| 1600 px      | 284 KB   | 245 KB, ×0.82 (0.83)  | 190 KB, ×0.64 (65)    |
| 2048 px      | 413 KB   | 384 KB, ×0.88 (0.86)  | 282 KB, ×0.66 (70)    |
| 2560 px      | 590 KB   | 559 KB, ×0.93 (0.88)  | 411 KB, ×0.69 (75)    |

Matching by PSNR instead (on luma) favours the newer formats: WebP comes out at ×0.68–0.76 of JPEG and AVIF at ×0.50–0.54. Either way:

- AVIF saves about a third to a half over JPEG at equal quality.
- WebP saves less: 7–32%, and least at the larger sizes.
- A 2048-pixel JPEG at 0.8 is about 13% of the original file, so roughly 7 times smaller.
- Photos differ a lot. A busy scene (a counter of salads) was 2.4 times the size of a plain one (a single plate).

**Published measurements.** Google's WebP study found WebP files 25–34% smaller than JPEG at equal SSIM ([Google](https://developers.google.com/speed/webp/docs/webp_study)). Google's AVIF article reports savings of "greater than 50%" over JPEG, depending on content and quality ([web.dev](https://web.dev/articles/compress-images-avif)). My SSIM results are less favourable to WebP at large sizes. My PSNR results are close to both claims.

### 3.3 What adds to the size

- **Base64.** If the JSON export or the standalone page embeds the picture as base64 (for example a `data:` URL), the picture grows by a third ([RFC 4648, section 4](https://www.rfc-editor.org/rfc/rfc4648#section-4)). A 413 KB JPEG becomes about 551 KB of text.
- **A second, header-size copy.** Storing a 1200-pixel copy beside a 2048-pixel one adds about 45% (184 KB on top of 413 KB, as JPEG 0.8). The alternative is one file that the browser scales down for the header.

## 4. How long it takes, and the main thread

### 4.1 Measured times

All rows start from one of the 7 photos (a 12-megapixel JPEG) and end with a 2048-pixel JPEG at quality 0.8, unless the row says otherwise. Times are medians over the photos, with the range in brackets. See [Method](#method).

| Pipeline                                                                                                                 | Time                                                                          | Long tasks on the main thread |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------- |
| Main thread: `img.decode()`, `drawImage` onto a smaller `<canvas>`, `toBlob`                                             | 395 ms (257–769)                                                              | One, of 233 ms (113–362)      |
| Worker: `createImageBitmap(file)`, `drawImage` onto a smaller `OffscreenCanvas`, `convertToBlob`                         | 262 ms (207–280)                                                              | None                          |
| Worker: `createImageBitmap(file)`, then `createImageBitmap(bitmap, { resize…, resizeQuality: 'high' })`, `convertToBlob` | 338 ms (216–358)                                                              | None                          |
| Encoding WebP 0.8 instead of JPEG, 2048 px                                                                               | 425 ms (381–523) for the encode alone, against 96–175 ms for JPEG             | None                          |
| Encoding a 1200-pixel JPEG for the header as well                                                                        | 59 ms more                                                                    | None                          |
| AVIF with `@jsquash/avif` in a worker, quality 60, speed 6                                                               | 5.2 s (3.6–7.6) for the encode alone                                          | None                          |
| HEIC decode with `libheif-js` in a worker                                                                                | 134 ms per megapixel, so about 1.6 s for 12 megapixels (scaled, not measured) | None                          |

### 4.2 How the test CPU compares with a phone

The test ran on an Intel N100, a 6-watt laptop chip. Geekbench 6 results for the N100 are mostly 1,200–1,275 single-core ([Geekbench Browser](https://browser.geekbench.com/processors/intel-n100)). A Samsung Galaxy A55, a popular mid-range phone, scored 1,130 ([Geekbench Browser](https://browser.geekbench.com/v6/cpu/16950600)). Geekbench's site blocked my requests, so I read both figures from search results. So the times above are a fair guess for a current mid-range Android phone. Some things would change them:

- Phones slow down when hot, and older or cheaper phones are slower.
- A phone usually draws the canvas on its GPU. Headless Chrome on Linux may not.
- A 24-megapixel iPhone photo has twice the pixels to decode.

### 4.3 Should it run off the main thread?

Yes, if Rosa wants taps to stay responsive while a picture is shrunk.

- On the main thread, every photo caused one long task, of 113–362 ms. A long task is one that keeps the main thread busy for 50 ms or more ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)). Google counts a response time (INP) of up to 200 ms as good ([web.dev](https://web.dev/articles/inp)). A tap during that task waits for it to end.
- In a worker, the main thread had no long tasks at all.
- Every browser Rosa runs in can do the whole pipeline in a worker (see [2.3](#23-offscreencanvas-and-workers)).
- A WebAssembly decoder or encoder (HEIC, AVIF) runs for seconds on whatever thread calls it. It has to be in a worker.
- Decoding at full size still needs the memory for the whole picture, in the worker too: about 48 MB for 12 megapixels and 98 MB for 24. Calling `close()` on each `ImageBitmap` once it is used frees that memory early ([HTML](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-imagebitmap-close)).

## Method

The scripts lived in a scratch directory and are not part of the repo.

**Machine.** An Intel N100 laptop CPU (4 cores, 6 W) with 14 GB of memory, on Linux. Chrome for Testing 151 ran headless, driven by Playwright.

**Photos.** Seven 4032×3024 camera JPEGs of food from Wikimedia Commons, with their original EXIF data:

1. [A dish at Rikki Tiki Tavern](https://commons.wikimedia.org/wiki/File:A_dish_at_Rikki_Tiki_Tavern_%28May_2023%29.JPG), iPhone 13, CC0
2. [Dish at Yim Thai Yeronga](https://commons.wikimedia.org/wiki/File:Dish_at_Yim_Thai_Yeronga,_2024,_03.jpg), iPhone 15 Pro Max, CC BY-SA 4.0
3. [Fish dish with salad and pickles](https://commons.wikimedia.org/wiki/File:Fish_dish_with_salad_and_pickles.jpg), Galaxy S10, CC BY-SA 4.0
4. [Bigeye tuna salsa verde](https://commons.wikimedia.org/wiki/File:Bigeye_tuna_salsa_verde.jpg), Galaxy S9, CC BY-SA 2.0
5. [Jídlo v českém pavilonu, Expo 2025](https://commons.wikimedia.org/wiki/File:Jidlo_v_ceskem_pavilonu_Expo_2025.jpg), iPhone 14 Pro, CC BY 4.0
6. [Speca dollma](https://commons.wikimedia.org/wiki/File:Speca_dollma.jpg), iPhone SE (2nd generation), CC BY-SA 4.0
7. [Selection of salads in a Warsaw fast food outlet](https://commons.wikimedia.org/wiki/File:Selection_of_salads_in_fast_food_outlet_in_Warsaw,_2019.jpg), iPhone XS Max, CC BY-SA 4.0

**Sizes.** In a worker, Chrome decoded each photo with `createImageBitmap`, drew it onto an `OffscreenCanvas` at 1200, 1600, 2048 and 2560 pixels on the longest side (`imageSmoothingQuality: 'high'`), and encoded it with `convertToBlob`. JPEG at quality 0.5–0.9 and WebP at 0.6–0.95. The same canvas was also saved as PNG, as the reference. AVIF came from `@jsquash/avif` 2.1.1 in Node 24, from the same reference pixels, at quality 50–80, speed 6, 4:2:0.

**Quality.** SSIM with `ssim.js` (its default Weber algorithm, with downsampling turned off so it compares every pixel), and PSNR on luma (BT.601 weights). Each encoded file was decoded and compared with its PNG reference. For "same quality as JPEG 0.8", I interpolated each photo's WebP and AVIF sizes between the two quality settings whose score brackets the JPEG's score, then took the median over the photos. SSIM and PSNR are rough guides. Neither is a viewer's judgement.

**Timing.** Each pipeline ran 3 times per photo; the tables give the median over photos of each photo's median. Long tasks were counted with a `PerformanceObserver` for `longtask` entries on the page's main thread.

**Other tests.** An EXIF orientation test (an 800×600 JPEG tagged orientation 6), a check of which types `toBlob` and `convertToBlob` really produce, a check of HEIC decoding in Chrome, and a timing of `libheif-js` 1.23.5 on the [libheif example HEIC](https://github.com/strukturag/libheif/blob/master/examples/example.heic) (1280×854).

**Limits.** I had no iPhone, Mac or Android phone, so Safari and phone results come from source code and documentation. Headless Chrome on a laptop may draw the canvas differently from Chrome on a phone, where the canvas usually runs on the GPU. Sizes from Safari's and Firefox's JPEG encoders will differ from Chrome's at the same quality number.
