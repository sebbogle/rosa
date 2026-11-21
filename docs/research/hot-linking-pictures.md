# Linking to a picture hosted elsewhere

Could a recipe's picture be a link to an image on someone else's server (a hot-link), instead of a picture Rosa holds itself? This page answers that against primary sources. It was researched on 21 November 2026, against `@angular/service-worker` 22.2.3 as installed in this repo.

## Verdict

Rule hot-linking out. A hot-linked picture shows only while a third-party host keeps serving it, to this reader, from this origin, at this moment. Rosa can't keep a reliable copy for offline use, can't put the picture itself into an export or the standalone page, and tells the host about every reader each time the picture loads. Holding the picture in Rosa is the only option that goes everywhere the recipe goes.

## What a hot-link would be

The recipe would store a URL. Rosa would show it with `<img src="…">`, so the browser fetches the image from the host each time it is shown. Rosa never has the image's bytes. The upside is size: the URL is a short string, so it syncs, exports and imports like any other text field.

## Offline use

**An `<img>` from another origin gets an opaque response.** An `<img>` with no `crossorigin` attribute makes a request in `no-cors` mode with credentials mode `include` ([HTML, create a potential-CORS request](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#create-a-potential-cors-request)). A cross-origin `no-cors` response reaches the page and the service worker as an opaque response: status 0, no headers, no readable body ([Fetch, opaque filtered response](https://fetch.spec.whatwg.org/#concept-filtered-response-opaque)). Its `ok` is false, because `ok` means a status from 200 to 299 ([Fetch, ok status](https://fetch.spec.whatwg.org/#ok-status)).

**An ngsw asset group caches only hosts that allow CORS, and breaks the rest.** Asset groups accept `resources.urls` for files on other origins. These are "cached according to their HTTP headers", and the docs say to make sure CORS is set up on each origin ([Angular, service worker configuration](https://angular.dev/ecosystem/service-workers/config)). The reason is in the code. The asset group makes a new request that keeps the headers and referrer but not the `no-cors` mode, so it goes out in `cors` mode. A comment leaves keeping the mode as a TODO (`newRequestWithMetadata` in [`assets.ts`](https://github.com/angular/angular/blob/main/packages/service-worker/worker/src/assets.ts)).

- If the host sends `Access-Control-Allow-Origin`, the image is cached.
- If it doesn't, the fetch fails. `safeFetch` turns the failure into a 504 response, and `fetchAndCacheOnce` throws a plain `Error` because `res.ok` is false (same file). The driver falls back to the network only for critical errors, and rethrows the rest ([`driver.ts`](https://github.com/angular/angular/blob/main/packages/service-worker/worker/src/driver.ts)). A rejected `respondWith` promise becomes a network error ([Service Workers, `respondWith`](https://w3c.github.io/ServiceWorker/#fetch-event-respondwith)).

So an image from a host without CORS, listed in an asset group, would fail to load even online. This comes from reading the code, which matches the installed 22.2.3 bundle. It was not tried in a browser.

**An ngsw data group can cache opaque responses, blind.** Data groups have a `cacheOpaqueResponses` option. It defaults to `true` for the `freshness` strategy and `false` for `performance` ([Angular config](https://angular.dev/ecosystem/service-workers/config)). The code stores a response only if `res.ok`, or if it is opaque and the option allows it ([`data.ts`](https://github.com/angular/angular/blob/main/packages/service-worker/worker/src/data.ts)). The docs warn that the worker "is not allowed to read its status", so it may store an error. Chrome's Workbox docs give the same warning: a cached error can mean "a persistently broken experience" ([Chrome, caching resources during runtime](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime)).

**ngsw picks requests by URL pattern only, fixed at build time.** Patterns become regular expressions tested against the request URL, and they match partially ([Angular config](https://angular.dev/ecosystem/service-workers/config); `new RegExp(pattern)` in [`data.ts`](https://github.com/angular/angular/blob/main/packages/service-worker/worker/src/data.ts)). The worker does not look at a request's destination, so it can't select "every image". A hot-link can point at any host. A catch-all pattern for other origins would also catch Rosa's own requests to Google. Data groups cache GET and HEAD responses ([Angular config](https://angular.dev/ecosystem/service-workers/config)), and reading a file through the Drive API is a GET request ([Drive API, files.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)). So the config could name a few known hosts, or none.

**Caching is lazy, and it expires.** A data group stores a response only when the page requests it. A picture shows offline only on a device that has already shown it online. A recipe that reaches a phone through sync and is first opened offline shows no picture. `maxSize` and `maxAge` then evict entries ([Angular config](https://angular.dev/ecosystem/service-workers/config)).

**Opaque responses cost far more quota than their size.** In Chrome, each cached opaque response counts as at least about 7 MB towards the origin's quota, and the padding varies by browser ([Chrome, caching resources during runtime](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime)).

**Eviction hits the cache and the cookbook together.** Cache Storage and IndexedDB share one quota per origin ([MDN, storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). Under storage pressure the browser deletes the data of the least recently used origin, unless it was granted persistent storage. Safari deletes all script-writable storage of a site after seven days of use without interaction ([WebKit, full third-party cookie blocking and more](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). This applies to a held picture on the device too. The difference is recovery: a held picture comes back from Drive or an export, and a cached hot-link comes back only if the host still serves it.

**Asking for CORS makes it worse.** With `crossorigin="anonymous"` the request is made in `cors` mode ([HTML](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#create-a-potential-cors-request)). The response is readable, but only if the host sends `Access-Control-Allow-Origin`. If it doesn't, the CORS check fails and the fetch returns a network error, so the image does not load at all ([Fetch, HTTP fetch](https://fetch.spec.whatwg.org/#http-fetch)). Rosa can't know in advance which hosts send the header.

**`http:` links fail in Rosa.** Rosa is served over HTTPS. Browsers rewrite an `http:` image URL to `https:` and define no fallback to `http:` ([W3C, Mixed Content](https://w3c.github.io/webappsec-mixed-content/)). A host without HTTPS fails. ngsw ignores such requests on purpose ([`driver.ts`](https://github.com/angular/angular/blob/main/packages/service-worker/worker/src/driver.ts)).

In short, a hot-linked picture can show offline only on a device that showed it online before, only for hosts named in the config, only until it is evicted, and possibly as a cached error.

## Link rot and hosts that refuse hot-linking

**Links rot.** Pew Research found that 38% of web pages that existed in 2013 were gone ten years later, and 25% of all pages it collected from 2013 to 2023 were gone by October 2023 ([Pew Research Center, when online content disappears](https://www.pewresearch.org/data-labs/2024/05/17/when-online-content-disappears/)). A recipe is meant to be kept for years.

**Referrer checks.** Cloudflare's Hotlink Protection "denies access to requests when the HTTP referer does not include your website domain name". It lets blank referrers through, and covers `gif`, `ico`, `jpg`, `jpeg` and `png` ([Cloudflare, Hotlink Protection](https://developers.cloudflare.com/waf/tools/scrape-shield/hotlink-protection/)). By default the browser sends Rosa's origin as the referrer ([MDN, Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)), so such a host refuses the image. `referrerpolicy="no-referrer"` gets past Cloudflare's check, but not a host that demands its own domain as the referrer.

**Resource policy.** A host can send `Cross-Origin-Resource-Policy: same-site` or `same-origin`. The browser then blocks the image on any other site, Rosa included ([MDN, Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy)).

**CORS.** Showing a no-CORS image needs no CORS. Reading its bytes does. An image drawn without CORS approval taints a canvas, and `toBlob()` and `toDataURL()` then throw ([MDN, CORS-enabled images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)). Rosa has no server to fetch on its behalf. So Rosa can't turn a hot-link into a held picture later, except from hosts that allow CORS.

**Expiring signed URLs.** Many image URLs stop working by design.

- A Google Cloud Storage signed URL lasts at most 604800 seconds, 7 days ([Google Cloud, signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls)).
- Discord attachment URLs carry an expiry (`ex`), an issue time (`is`) and a signature (`hm`), and have "a preset expiry time" ([Discord, signed attachment CDN URLs](https://docs.discord.com/developers/reference)).
- A Drive `thumbnailLink` "typically lasts on the order of hours" ([Drive API, files](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)).

The recipe keeps the URL, and the URL dies.

**Region blocks, served as a picture.** On 21 November 2026, from the machine this research ran on, `imgur.com` answered "Content not available in your region" and linked Imgur's help article on access in the United Kingdom. Every `i.imgur.com` image URL tried, including made-up ones, answered HTTP 200 with the same PNG, which reads "Content not viewable in your region". So the `<img>` loads without an error, Rosa can't tell the picture is gone, and a service worker that caches it keeps the stand-in.

## Privacy

**Each load tells the host about the reader.** Every time the browser fetches the picture, the host learns the reader's IP address, the time, the browser's `User-Agent` and language headers, and which image was asked for. The image URL identifies the recipe's picture.

**The referrer names Rosa.** The default policy, `strict-origin-when-cross-origin`, sends the page's origin to another HTTPS origin ([MDN, Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)). The host learns the reader uses Rosa.

**Cookies may go too.** An `<img>` request has credentials mode `include` ([HTML](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#create-a-potential-cors-request)). If the browser allows third-party cookies, the host's cookies marked `SameSite=None` are sent ([MDN, Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)), and a host the reader is signed in to can tie the view to their account. Chrome still allows them by default ([Privacy Sandbox, next steps, 22 April 2025](https://privacysandbox.google.com/blog/privacy-sandbox-next-steps)). Safari blocks them ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). Firefox on desktop confines them to the site that set them ([Mozilla, Total Cookie Protection](https://blog.mozilla.org/en/products/firefox/firefox-rolls-out-total-cookie-protection-by-default-to-all-users-worldwide/)).

**It happens on every view, and to other readers.** A data group using `freshness`, the strategy that caches opaque responses by default, goes to the network on every online view ([Angular config](https://angular.dev/ecosystem/service-workers/config)). Anyone who opens a shared standalone page also contacts the host.

**It cuts against Rosa's own promises.** Rosa's privacy page says "I collect nothing: no analytics, no tracking", and that Drive data "goes straight from your browser to Google" (`public/privacy.html`). Hot-links bring in third parties on every view, which that page doesn't mention. The recipe pane already opens the source link with `rel="noreferrer noopener"` (`src/app/recipe/recipe-pane/recipe-pane.html`). A link needs a click; an `<img>` fetches by itself.

## Pictures only on the device

A user's own photo has no URL. A hot-link would need Rosa to upload it somewhere first.

### Free, keyless hosts

- **Imgur** needs a registered application's `client_id`, even for anonymous uploads. Each application gets about 1,250 uploads a day ([Imgur API](https://apidocs.imgur.com/)). A static app ships one client ID, so every Rosa user would share that limit. Imgur is also blocked in some regions, as shown above. In April 2023 it announced it would remove old, unused content not tied to an account (reported by [PetaPixel](https://petapixel.com/2023/04/20/imgur-is-banning-sexual-content-and-wiping-images-not-linked-to-users); Imgur's own help centre refused automated fetches).
- **ImgBB** marks its `key` parameter "(required)" ([ImgBB API](https://api.imgbb.com/)).
- **Catbox** takes anonymous uploads with no key. But anonymous files are removed after two years with no hits, uploads are permanent only for accounts ([Catbox FAQ](https://catbox.moe/faq.php)), and deleting a file needs a `userhash`, so an anonymous upload can never be deleted ([Catbox tools](https://catbox.moe/tools.php)). Its FAQ lists countries and providers that block it, including DNS blocks in Australia. It is run by one person.

Any public host also makes the photo visible to anyone with the URL, out of the user's control. A host account owned by Rosa's author would put users' photos in his hands, which the privacy page rules out.

### The user's own Drive folder

**Rosa can store the picture there.** The `drive.file` scope covers files the app creates ([Drive API, choose scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)). That is how Rosa already writes recipes to the Drive folder.

**Linking to it is another matter.** An `<img>` can't send Rosa's auth token, so the file would have to be public. `permissions.create` accepts the `drive.file` scope ([Drive API, permissions.create](https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create)), and the `anyone` type exists ([Drive API, share files](https://developers.google.com/workspace/drive/api/guides/manage-sharing)). So Rosa could make the photo public. That exposes it to anyone with the link, and a Workspace admin can turn off sharing outside the organisation, including links ([Google Workspace Admin Help, external sharing](https://knowledge.workspace.google.com/admin/drive/manage-external-sharing-for-your-organization)).

**Google does not support Drive links as image sources.** From 2 January 2024, Drive serves downloads without third-party cookies, and apps that relied on Drive's download URLs were told to move to the publishing flows, embedding with an iframe ([Workspace Updates, third-party cookies in Drive](https://workspaceupdates.googleblog.com/2023/10/upcoming-changes-to-third-party-cookies-in-google-drive.html)). Google's AppSheet help says `drive.google.com/uc` links no longer display images, and other `drive.google.com` URLs such as `/file` are "not supported for displaying images" ([AppSheet Help](https://support.google.com/appsheet/answer/14453216?hl=en)). The documented links don't fill the gap. `webContentLink` is "a link for downloading the content of the file in a browser". `thumbnailLink` is short-lived, "not intended for direct usage on web applications due to … CORS", and needs a credentialed request if the file isn't public ([Drive API, files](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)).

**What does work is not a hot-link.** Rosa can download a private file with `files.get` and `alt=media`, authorised by its token ([Drive API, download files](https://developers.google.com/workspace/drive/api/guides/manage-downloads)). The token lasts about an hour, and Rosa never renews it by itself ([Drive](../architecture/drive.md)). So the picture would show only while the token is valid, unless Rosa keeps the bytes on the device. Keeping them is holding the picture, with Drive as one more copy, which is the leaning. A reader of a standalone page on another machine can't load a private Drive file at all.

## The standalone page

**Offline, it shows a broken image.** A hot-linked `<img>` needs the network when the page is opened.

**Rosa's service worker can't help.** A page opened from disk has a `file:` URL. Browsers decide its origin, and "when in doubt" it is opaque ([URL Standard, origin](https://url.spec.whatwg.org/#concept-url-origin)). A page whose navigation does not go through HTTP fetch, and whose origin is opaque, gets no active service worker ([Service Workers, 2.5.1 the window client case](https://w3c.github.io/ServiceWorker/)). The page is also outside Rosa's origin and scope.

**The browser's HTTP cache can't help either.** Since Chrome 86, the HTTP cache is keyed by top-level site. An image cached under one site is not reused under another ([Chrome, HTTP cache partitioning](https://developer.chrome.com/blog/http-cache-partitioning)). A picture cached while reading in Rosa is not reused by the page.

**Years later, it meets link rot and expiry.** See the figures and examples above.

**On another machine, it meets the reader's region and the host's rules.** A region block or a private Drive file means no picture for that reader.

**Rosa can't fix this at export time.** To embed the picture, Rosa needs its bytes, and an opaque response gives none. The standalone page already inlines all its CSS, so it opens without Rosa (`src/app/export/standalone-page.ts`). A picture Rosa holds can be written into the page the same way, as a `data:` URL, and then shows offline, on any machine, for as long as the file exists.

## What this means for a held picture

Hot-linking's only real gains are a small recipe and no storage. Neither is worth a picture that disappears offline, on other machines, and over time. A pasted image URL could still serve as one way to bring a picture into Rosa, from hosts that allow CORS, with Rosa keeping the bytes from then on. `i.imgur.com` sent `Access-Control-Allow-Origin: *` when checked, for example. The user can always save the image and choose the file instead.
