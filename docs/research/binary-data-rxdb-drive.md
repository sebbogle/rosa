# Binary data in RxDB and the Drive plugin

Research for the decision ticket "Where a picture lives". It asks what Rosa's storage and sync can do with a picture: at most one per recipe, shown in the recipe's header, and carried everywhere the recipe goes.

Written on 21 November 2026, against the versions Rosa pins: RxDB 17.6.0 on the Dexie storage, and the Google Drive replication plugin from the same package, run with `patches/rxdb+17.6.0.patch`.

Most findings come from reading RxDB's source in `node_modules/rxdb/src`. That is the TypeScript the published build is made from. The patch changes only the build in `dist`, and none of the attachment code. RxDB paths below are relative to `node_modules/rxdb/`. Bare names such as `index.ts`, `upstream.ts`, `downstream.ts`, `init.ts` or `transaction.ts` mean the Drive plugin's files in `src/plugins/replication-google-drive/`. Files from RxDB's sync core are always written out in full, as `src/replication-protocol/...`. Rosa's own files are given from the repo root. One finding was checked by running RxDB; see [A run that shows the dropped picture](#a-run-that-shows-the-dropped-picture).

Three ways to hold a picture are compared:

- **Inline**: a text field on the recipe that holds the picture as base64.
- **Attachment**: an RxDB attachment on the recipe document.
- **Picture document**: a second collection with one document per picture, synced by a second run of the Drive plugin.

## Summary

- **An attachment sits beside the recipe on the device, but inside it on Drive.** Dexie keeps an attachment's bytes as a Blob in a separate object store. The recipe document holds only a small stub. The Drive plugin, though, writes the bytes as base64 into the same recipe file. With the plugin as it is, only a picture document gives the picture its own Drive file.
- **An attachment, as shipped, drops the picture from Drive.** The plugin sends an attachment's bytes only when the attachment is new or has changed. It then rewrites the whole recipe file. So the next edit to anything else in the recipe removes the picture from its Drive file. A device whose first fetch reads that file cannot store the recipe. A run of RxDB's own sync code on the Dexie storage, with a stand-in for Drive, shows this. A push modifier in Rosa can put the bytes back, and the same run shows that this works.
- **Rosa's code strips attachments today.** The lenient gate runs on every recipe arriving from Drive and keeps only recipe fields. Left as it is, each pull would delete the device's copy of a picture. Crossed edits, the check for unsent changes, and the way Rosa reads documents would also need to change.
- **Inline makes each recipe file about as big as its picture plus a third.** A 300 KB picture turns a recipe file of about 1 KB into about 400 KB. Every push of the recipe moves the picture through Drive several times, even after a title edit. Every other device then downloads it again.
- **Inline meets size limits in the sync.** The plugin's log file holds the new state and the last-agreed state of every recipe in a push. Rosa pushes up to 50 recipes at once. The plugin uploads with two upload types that Google documents for files of 5 MB or less.
- **Inline costs on the device too.** A device that syncs holds each picture twice: in the cookbook and in the record of the last-agreed state. Rosa reads every recipe before the app first shows, so every picture would be read and held in memory at start-up.
- **A picture document works, with more moving parts.** It needs its own folder path, such as `rosa/pictures` inside the Drive folder. It cannot share `rosa` itself. Clear Drive would delete it with the Drive folder. The recipe sync must set up the Drive folder first. Sync, and Rosa's Drive state, would then have two of everything.
- **The patch needs no change for any of the three.** Putting dropped attachment bytes back can be done in Rosa without patching. A file over 5 MB would need new upload code.
- **Storage quotas are not the limit.** Chromium and Safari 17 let a site use up to 60% of the disk. Firefox allows 10% of the disk or 10 GiB, whichever is smaller. The real risk is the browser deleting the cookbook. `navigator.storage.persist()` protects it when the device runs short of space. Only Firefox also raises the quota when it is granted.

## RxDB attachments on Dexie

### They are supported

Attachments work on the Dexie storage. Each collection gets its own IndexedDB database, named `rxdb-dexie-<database>--<schema version>--<collection>`. Rosa's would be `rxdb-dexie-rosa--0--recipes` (`src/plugins/storage-dexie/dexie-helper.ts:28`). It has three object stores: `docs`, `changes` and `attachments` (`dexie-helper.ts:14-16`, `46-52`).

RxDB's docs say that "Not all replication plugins support the replication of attachments" ([rx-attachment](https://rxdb.info/rx-attachment.html)). The Drive plugin has supported them since 17.3.0 (`CHANGELOG.md:163`, `180`).

### How they are stored

- The bytes are a `Blob`. RxDB calls Blob "the canonical internal type" for attachment data (`src/types/rx-storage.d.ts:138-146`).
- Each attachment is one row in the `attachments` store. Its key is `<document id>||<attachment id>` and its value is `{ id, data: Blob }` (`dexie-helper.ts:296-298`, `src/plugins/storage-dexie/rx-storage-instance-dexie.ts:185-199`).
- The document row keeps a stub under `_attachments`: `digest`, `length` and `type`. Before writing, RxDB strips the bytes from the document (`src/rx-storage-helper.ts:548-573`).
- A write puts the document and its attachments in one IndexedDB transaction (`rx-storage-instance-dexie.ts:144-148`).
- An attachment whose digest has not changed is not written again (`rx-storage-helper.ts:424-440`).
- Deleting a document deletes its attachment rows (`rx-storage-helper.ts:372-387`). Dropping an attachment from a document deletes its row too (`rx-storage-helper.ts:448-460`).
- The digest is a hash of the bytes, made by the database's hash function (`src/plugins/attachments/index.ts:124-131`).

RxDB's Dexie page implies that Dexie stores attachments as base64: it says the premium storage "stores attachments data as binary instead of base64" ([rx-storage-dexie](https://rxdb.info/rx-storage-dexie.html)). The 17.6.0 source stores the Blob itself, as above.

### Size limits

RxDB sets none. There is no size check in the attachments plugin, the Dexie storage, or the Drive plugin. The only size constants in the Drive plugin count files, not bytes (`src/plugins/replication-google-drive/google-drive-helper.ts:10-11`). The limits that apply are the browser's storage quota (see [Storage quotas](#storage-quotas)) and Drive's upload types (see [Inline in the recipe document](#inline-in-the-recipe-document)).

### Schema

- The schema must have an `attachments` object. Without one, every attachment method throws `AT1` (`src/plugins/attachments/attachments-utils.ts:9-16`).
- It takes optional `encrypted`, `compression` and `compressibleTypes` (`src/types/rx-schema.d.ts:314-327`). Compression passes JPEG and PNG through unchanged ([rx-attachment](https://rxdb.info/rx-attachment.html)), so it would not shrink a photo.
- Rosa's schema has no `attachments` today (`src/app/recipe/recipe-schema.ts:6-84`).
- Adding `attachments`, or adding a `picture` property for the inline way, changes the schema. RxDB refuses a changed schema with the same version number (`DB6`, `src/rx-database.ts:464-483`). Raising the version opens a new IndexedDB database, since the version is part of its name (`dexie-helper.ts:28`). The recipes then need a migration, or Rosa starts with an empty cookbook. Rosa is pre-production, so either works.
- The attachments plugin has to be added with `addRxPlugin(RxDBAttachmentsPlugin)` before `putAttachment()` and `getAttachment()` exist (`attachments/index.ts:277-327`).

### Queries

Attachment bytes are not part of the document, so a query cannot look at them. The docs offer only `getAttachment()` by id and `allAttachments()` ([rx-attachment](https://rxdb.info/rx-attachment.html)). Rosa's one query is `find()` with no selector (`src/app/recipe/recipe-store.ts:19`). It would read the stubs and never the bytes.

### Reactivity

- `putAttachment()` writes through the document's write queue (`attachments/index.ts:133-148`). The document gets a new revision, so Rosa's `find()` signal emits (`recipe-store.ts:19-31`).
- `toJSON()` drops `_attachments` unless it is called as `toJSON(true)` (`src/rx-document.ts:261-271`). Rosa builds its `Recipe` objects with `toJSON()` (`recipe-store.ts:111`). As written, Rosa would see no stub.
- `getData()` is async. It reads the Blob from IndexedDB (`attachments/index.ts:73-85`, `rx-storage-instance-dexie.ts:299-315`). It is not a signal, so showing the picture means turning the Blob into an object URL.
- `allAttachments$` emits only when the set of attachment ids changes (`attachments/index.ts:298-301`). The docs say it emits when an attachment is "replaced" ([rx-attachment](https://rxdb.info/rx-attachment.html)). The code does not: a new picture under the same id would not emit. Rosa does not use this observable.

### What in Rosa would meet attachments

- **The lenient gate drops them.** Rosa passes recipes arriving from Drive through `recipeStateOf` as the pull modifier (`src/app/drive/drive-service.ts:414`). It keeps only recipe fields and `_deleted` (`recipe-schema.ts:86-88`, `src/app/recipe/recipe-gate.ts:80-104`). RxDB runs the pull modifier after the plugin has turned the base64 back into Blobs (`src/plugins/replication/index.ts:276-279`, `326-329`). The arriving state then has no `_attachments`, so RxDB writes it with none (`src/replication-protocol/downstream.ts:420-434`). The storage then deletes the attachment row (`rx-storage-helper.ts:448-460`). So, without a change, every pull of a recipe would delete its picture on that device.
- **Crossed edits would not treat the picture as a part.** `_attachments` is not a `Recipe` field, so it is not one of the eight parts (`src/app/recipe/crossed-edits.ts:11-21`). The settled recipe starts from this device's version (`crossed-edits.ts:49-51`). RxDB keeps whatever `_attachments` that result has (`src/replication-protocol/conflicts.ts:34-46`). So a picture changed only on the other device would lose to this device's old one.
- **The unsent-changes check would see a change in every recipe with a picture.** It compares documents with `writeDocToDocState(doc, false, false)`, which drops `_attachments` (`src/app/drive/unsent-changes.ts:39`). The stored last-agreed state keeps the stubs, so the two would never match.
- **Import keeps a picture already there.** `bulkUpsert()` merges attachments into the stored document unless `deleteExistingAttachments` is set (`src/rx-collection.ts:729-742`). Rosa imports with `bulkUpsert()` (`recipe-store.ts:68-71`).

## The Drive plugin and binary data

### It carries attachments, inside the recipe file

When the schema has `attachments`, the plugin replicates them unless told `attachments: false` (`src/plugins/replication-google-drive/index.ts:118-124`, `google-drive-types.ts:105-112`). It does not upload them as separate files.

- On push, it turns each Blob into base64 and puts it in a top-level `_attachments_data` field. `_attachments` keeps only the stubs (`index.ts:176-199`, `src/replication-protocol/helper.ts:103-128`).
- On pull, it turns `_attachments_data` back into Blobs and removes the field (`index.ts:141-165`, `src/replication-protocol/helper.ts:150-166`).
- The docs say the same: "attachment binary data is encoded as base64 and stored in a separate `_attachments_data` field" ([replication-google-drive](https://rxdb.info/replication-google-drive.html)).

So an attachment makes the recipe's Drive file as big as an inline picture would. The two differ in where the picture sits on the device, not on Drive.

### It drops attachment bytes that did not change

The push path only fills in the bytes of an attachment that is new, or whose digest differs from the last-agreed state (`src/replication-protocol/upstream.ts:410-422`, `attachments-utils.ts:59-81`). An unchanged attachment arrives as a stub. The plugin turns only Blobs into base64 (`src/replication-protocol/helper.ts:116`), so the stub goes out with no `_attachments_data`.

The plugin then writes the whole document over the recipe's Drive file (`src/plugins/replication-google-drive/document-handling.ts:132-145`). Nothing merges in the old file's `_attachments_data`.

The result:

1. Device A adds a picture and syncs. The Drive file holds the picture.
2. Device A renames the recipe and syncs. The Drive file now holds the stub but not the picture.
3. Device B already had the picture. Its pull sees the same digest and keeps its copy (`rx-storage-helper.ts:424-440`).
4. Device C does its first fetch. It gets a stub with no bytes. The storage refuses to insert an attachment without bytes, with status 510 (`rx-storage-helper.ts:287-305`). On Dexie the write then throws `ensureNotFalsy() is falsy` (`rx-storage-instance-dexie.ts:207-208`). The recipe is not stored. The error reaches the sync's error stream (`src/replication-protocol/downstream.ts:547`). Rosa's classifier would call it fatal, since it carries no status and is not a network error (`src/app/drive/drive-errors.ts:51-58`). So Drive state would become `broken`.

RxDB's shared test suite covers adding, replacing and removing an attachment, and a conflict. It has no case where another field changes after the attachment is added (`src/plugins/test-utils/replication-base-test-suite.ts:274-420`).

Ways round it:

- **A push modifier in Rosa.** It is async and runs on each pushed document before the plugin sees it (`src/plugins/replication/index.ts:345-353`). It can read missing bytes with `collection.storageInstance.getAttachmentData()`. The run below shows this keeps the picture in the Drive file. It also runs on the last-agreed state (`src/plugins/replication/index.ts:351-353`). The conflict check compares only the stub fields there (`upstream.ts:57-61`), and the log replay writes only the new state (`upstream.ts:235-245`). So the extra Blob only adds an empty `{}` to the log file.
- **A new hunk in the patch**, in the plugin's push handler (`dist/esm/plugins/replication-google-drive/index.js`).

Put back sends every recipe with no last-agreed state, so all bytes go with it (`attachments-utils.ts:54-58`, `63-71`).

### A second collection in the same Drive folder

**The same folder path does not work.** The plugin uses fixed names under its folder path: `rxdb.json`, `transaction.json`, `rxdb-wal.json`, `docs/` and `signaling/` (`src/plugins/replication-google-drive/init.ts:46-103`, `transaction.ts:21`, `upstream.ts:14`). Pulls list every file in `docs/` (`src/plugins/replication-google-drive/downstream.ts:48-51`). Each file is named `<primary key>.json` (`document-handling.ts:25-30`, `96-111`). Two collections in one folder would share the lock and the log, pull each other's documents, and a picture keyed by its recipe's id would have the same file name as the recipe.

**A nested folder path works.** `folderPath` takes a path, and the plugin creates each folder along it (`google-drive-helper.ts:138-153`). A second `replicateGoogleDrive()` with `folderPath: 'rosa/pictures'` would give this layout:

```
rosa/                         the Drive folder, synced as recipes
├── rxdb.json
├── transaction.json
├── rxdb-wal.json
├── docs/
│   └── focaccia-5e0c7a93d14b.json     the recipe
├── signaling/
└── pictures/                 synced as pictures
    ├── rxdb.json
    ├── transaction.json
    ├── rxdb-wal.json
    ├── docs/
    │   └── focaccia-5e0c7a93d14b.json the picture, keyed by recipe id
    └── signaling/
```

The recipe sync ignores `pictures/`, since it reads only `rosa/docs/`. Its start-up check accepts other content in `rosa` once `rxdb.json` is there (`init.ts:54-60`).

What comes with it:

- **The recipe sync must set up the Drive folder first.** A folder that holds other things and no `rxdb.json` is refused with `GDR9` (`init.ts:54-60`). If the picture sync made `rosa/pictures` inside a new, empty `rosa`, the recipe sync would then be refused. The same applies after Clear Drive.
- **Clear Drive takes the pictures with it.** Rosa deletes the Drive folder by id (`src/app/drive/drive-api.ts:66-78`). Google says that "If the target is a folder, all descendants owned by the user are also deleted" ([files.delete](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/delete)).
- **Sync runs twice.** Each run has its own lock file and log, its own checkpoint and last-agreed records, and its own signaling loop that polls Drive (`src/plugins/replication-google-drive/signaling.ts:111-124`). Rosa's Drive state and the facts behind it are built around one sync today (`drive-service.ts:122-131`, `438-456`).
- **The two arrive separately.** Each sync has its own checkpoint, so a recipe can reach a device before its picture, or after. Deleting a recipe means deleting its picture document as a second write.
- **Crossed edits on a picture** would use the picture collection's own conflict handler. RxDB's default keeps Drive's copy (`src/replication-protocol/default-conflict-handler.ts:27-33`).
- **A recipe edit moves no picture bytes.** Only a change to the picture rewrites the picture's file.

## Inline in the recipe document

The numbers below are worked out from the code, with pictures of illustrative sizes. The recipes in `e2e/recipes.ts` measure 0.8 to 1.5 KB each as compact JSON, which is how the plugin writes them (`document-handling.ts:144`). Base64 is 4/3 the size of the bytes it encodes.

| Picture | As base64 | Recipe file in Drive |
| ------- | --------- | -------------------- |
| 100 KB  | 133 KB    | about 134 KB         |
| 300 KB  | 400 KB    | about 401 KB         |
| 1 MB    | 1.33 MB   | about 1.33 MB        |
| 3 MB    | 4 MB      | about 4 MB           |

### What every push moves

Take one recipe with an inline picture of base64 size P, whose title changes:

1. **Conflict check.** The plugin downloads the recipe's current Drive file: P down (`upstream.ts:43-46`).
2. **Log write.** It writes the change to `rxdb-wal.json`. Each row holds the new state and the last-agreed state, so the picture goes up twice: 2P up (`upstream.ts:128-134`, rows from `src/replication-protocol/upstream.ts:378-381`). The write then reads the file back: 2P down (`google-drive-helper.ts:281-310`).
3. **Log replay.** The next lock taken by any device reads the log, which is 2P down, and writes the recipe file, which is P up (`upstream.ts:205-260`, `document-handling.ts:132-145`).
4. **Other devices.** Each one downloads the changed file when it pulls: P down each (`downstream.ts:28-36`, `document-handling.ts:185-203`).

That makes 3P up and 5P down for the push and its replay, plus P for each other device. With a 300 KB picture, a title edit moves about 1.2 MB up and 2 MB down.

For comparison:

- An attachment whose picture did not change moves no picture bytes into the log. But the file loses its picture, as described above. With the push modifier fix, the new state carries the bytes, so it is 2P up and 3P down.
- A picture document moves nothing for a recipe edit.

### Upload size and the log file

- Rosa pushes up to 50 recipes at once (`drive-service.ts:33`, `415`). The plugin allows up to 250 (`google-drive-helper.ts:10-11`, `upstream.ts:22-28`).
- With inline pictures, the log file for one push is about 50 × 2P. With a 300 KB picture, that is about 40 MB. With 100 KB, about 13 MB.
- The plugin writes the log and updates recipe files with `uploadType=media` (`google-drive-helper.ts:281-284`, `document-handling.ts:132-135`). It creates new files with `uploadType=multipart` (`google-drive-helper.ts:488`). Google documents both "for a small file (5 MB or less)", and resumable upload "for large files (greater than 5 MB)" ([manage uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)). What Drive does with a larger simple upload was not tested.
- Rosa pushes many recipes at once on a device's first sync when it already holds recipes, on Put back, when a folder is renamed or removed (`recipe-store.ts:94-104`), and when many files are imported (`recipe-store.ts:68-71`).

### Pulls, first fetch and the lock

- Every pull runs inside the Drive folder's lock (`index.ts:141-165`, `src/plugins/replication-google-drive/transaction.ts:208-227`).
- Rosa sets no pull batch size, so RxDB's default of 100 applies (`drive-service.ts:414`, `src/plugins/replication/index.ts:256`). The plugin downloads up to 100 files per pull, five at a time (`downstream.ts:63-70`, `document-handling.ts:174-221`).
- With 300 KB pictures, a first fetch takes about 40 MB per batch of 100, all inside one lock. That is 32 s at 10 Mbit/s and 64 s at 5 Mbit/s.
- The lock times out after 60 s (`index.ts:49`). A device that is waiting clears a lock older than that (`transaction.ts:79-99`).

### On the device

- **Two copies.** The record of the last-agreed state keeps the whole document (`src/replication-protocol/meta-instance.ts:147-168`). For attachments, RxDB strips the bytes from it first (`src/replication-protocol/helper.ts:71-86`). For an inline field it does not, so a device that syncs holds each picture twice.
- **All of it read at start-up.** Rosa waits for its query of every recipe before the app starts (`src/app/recipe/provide-cookbook.ts:13-21`, `recipe-store.ts:25`). Dexie reads whole rows (`src/plugins/storage-dexie/dexie-query.ts:144-150`). With 200 recipes and 300 KB pictures, that is about 80 MB of text read and held in memory. Search reads only folders, title and tags (`src/app/contents/contents-filter.ts:7-9`), so it would hold the pictures without using them.

### Export, import and the standalone page

- An inline picture goes wherever the recipe's JSON goes. A recipe file is `JSON.stringify(recipe)` (`src/app/export/recipe-file.ts:8`), and the standalone page embeds recipes as JSON (`src/app/export/page-runtime.ts:20`). Both gates would need to know the field, since they keep only recipe fields (`recipe-gate.ts:80-104`).
- An attachment or a picture document is not part of the recipe object. Export would have to add it, for example as base64 in the recipe file or as its own file in the zip. Import would have to bring it back.
- Rosa's zips store files without compression (`src/app/export/zip.ts:9`, `34`), so a picture as base64 costs its full 4/3 in a zip.

## The patch

`patches/rxdb+17.6.0.patch` changes `google-drive-helper.js`, `transaction.js` and `upstream.js` in the plugin's build, with matching type changes.

- **Inline needs no change.** None of the hunks look at document content.
- **An attachment needs no change to the existing hunks.** None of them touch `index.js` or `replication-protocol/helper.js`, where attachments are encoded. So the patch neither causes nor fixes the dropped picture. A fix could be a new hunk in `index.js`, or a push modifier in Rosa, which needs no patch.
- **A picture document needs no change.** The patch changes the plugin's module, so a second sync gets the same fixes. Its file lookups work within a given parent folder (the patched `findOldestFile`, `createEmptyFile` and `readFolder`), so they work for a nested folder path too.
- **Files over 5 MB would need new hunks.** If Drive refuses larger simple uploads, `fillFileIfEtagMatches`, `updateDocumentFiles` and `insertMultipartFile` would need resumable upload. A smaller `PUSH_BATCH_SIZE` keeps the log under 5 MB without a patch, but does nothing for a single file that is over it.

## Storage quotas

What one site may store in IndexedDB, in the browsers Rosa runs in:

| Browser                                      | Without persistence                                                 | With `persist()` granted                                                   | How `persist()` is decided                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Chrome on desktop and Android                | 60% of the disk                                                     | The same quota, and not deleted when the device runs short of space        | No prompt. It depends on engagement, being installed or bookmarked, and notification permission |
| Firefox on desktop                           | 10% of the disk, or 10 GiB for the whole site, whichever is smaller | 50% of the disk, up to 8 TiB, with no site limit, and not deleted          | Firefox asks the user                                                                           |
| Safari 17 and later on macOS, iOS and iPadOS | 60% of the disk in Safari. 15% in other apps that show web pages    | WebKit gives no separate quota. The site "might be excluded from eviction" | No prompt. It depends on things like being opened as a Home Screen web app                      |
| Safari before 17                             | 1 GiB, then Safari asks the user for more                           | The same                                                                   |                                                                                                 |

Sources and details:

- **Chromium** lets the browser use 80% of the disk (`kPoolSizeRatio`, [quota_features.cc](https://chromium.googlesource.com/chromium/src/+/main/storage/browser/quota/quota_features.cc)) and one site 75% of that (`kDefaultPerStorageKeyRatio`, [quota_settings.cc](https://chromium.googlesource.com/chromium/src/+/main/storage/browser/quota/quota_settings.cc)), which is 60% of the disk. MDN gives the same 60% "in both persistent and best-effort modes" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). Android Chrome uses the same quota code.
- Since Chrome 133, on desktop and Android, `navigator.storage.estimate()` reports usage plus 10 GiB as the quota. The "Enforced quota will also be unaffected" ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/7q0YGQNVkjs)). So the reported number is not the real limit.
- Chrome grants persistence without asking when "a site is considered important", judged by engagement, installing or bookmarking, and notification permission ([web.dev](https://web.dev/articles/persistent-storage)).
- **Firefox** figures are from [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Firefox "delegates the permission request to the user" ([web.dev](https://web.dev/articles/persistent-storage)).
- **Safari 17 and later** figures are from WebKit's [storage policy post](https://webkit.org/blog/14403/updates-to-storage-policy/). It also caps all sites together at 80% of the disk in Safari, and 20% in other apps. A Home Screen web app "has the same origin quota and overall quota as when it is opened in a browser app". WebKit grants persistence "based on heuristics like whether the website is opened as a Home Screen Web App". The 1 GiB figure for earlier Safari is from [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

When browsers delete data:

- **Short of space.** Browsers delete the least recently used site first, and skip sites that have persistence ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
- **Safari's seven days.** Safari deletes "all of a website's script-writable storage after seven days of Safari use without user interaction on the site", IndexedDB included. A Home Screen web app counts its own days of use ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). None of the sources read say whether `persist()` exempts a site from this rule.

What this means for pictures:

- Even 500 recipes with 300 KB pictures would be about 150 MB as Blobs. As inline base64 on a device that syncs, with two copies, it would be about 400 MB. Both are far below these quotas on a phone with tens of gigabytes. Firefox's 10 GiB site limit is also far above it.
- The larger risk is the browser deleting the cookbook. Browsers delete a site's data as a whole ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)), so pictures would go with the recipes, wherever they are held. Rosa asks for persistence once the cookbook opens, and asks again a week after a refusal (`src/app/recipe/safekeeping.ts:18-39`).

## A run that shows the dropped picture

The script below runs RxDB 17.6.0's own replication code on the Dexie storage, with `fake-indexeddb` standing in for the browser's IndexedDB. A `Map` stands in for the Drive folder. Its push and pull handlers do what the plugin's handlers do with attachments: base64 on the way out, the whole file stored, and Blobs again on the way in (`index.ts:141-199`). It does not talk to Drive.

Output without the push modifier:

```
after adding the picture { title: 'Focaccia', base64InFile: true }
after renaming the recipe { title: 'Focaccia, renamed', base64InFile: false }
new device holds the recipe false
new device errors [ 'ensureNotFalsy() is falsy: ' ]
```

Output with `refill`, which adds the push modifier:

```
after adding the picture { title: 'Focaccia', base64InFile: true }
after renaming the recipe { title: 'Focaccia, renamed', base64InFile: true }
new device holds the recipe true
new device errors []
```

<details>
<summary>The script</summary>

Save it as `dropped-picture.mjs` next to a `node_modules` that holds `rxdb@17.6.0` and `fake-indexeddb@6.0.0`. Then run `node dropped-picture.mjs`, and `node dropped-picture.mjs refill`.

```js
import 'fake-indexeddb/auto';
import {
  addRxPlugin,
  createRxDatabase,
  deserializeDocAttachments,
  lastOfArray,
  serializeDocAttachments,
} from 'rxdb';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

addRxPlugin(RxDBAttachmentsPlugin);

const refill = process.argv[2] === 'refill';

const schema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: { id: { type: 'string', maxLength: 50 }, title: { type: 'string' } },
  required: ['id', 'title'],
  attachments: {},
};

const drive = new Map();
let tick = 0;

function refillFrom(collection) {
  return async (doc) => {
    const filled = {};
    for (const [id, stub] of Object.entries(doc._attachments ?? {})) {
      filled[id] = stub.data
        ? stub
        : {
            ...stub,
            data: await collection.storageInstance.getAttachmentData(doc.id, id, stub.digest),
          };
    }
    return { ...doc, _attachments: filled };
  };
}

async function device(name) {
  const db = await createRxDatabase({ name, storage: getRxStorageDexie() });
  await db.addCollections({ recipes: { schema } });
  const collection = db.recipes;
  const errors = [];
  const sync = replicateRxCollection({
    collection,
    replicationIdentifier: 'stand-in-for-drive',
    live: true,
    push: {
      modifier: refill ? refillFrom(collection) : undefined,
      async handler(rows) {
        for (const row of rows) {
          const file = await serializeDocAttachments(row.newDocumentState, true);
          drive.set(file.id, { text: JSON.stringify(file), at: ++tick });
        }
        return [];
      },
    },
    pull: {
      async handler(checkpoint) {
        const changed = [...drive.values()].filter((entry) => entry.at > (checkpoint?.at ?? 0));
        const documents = await Promise.all(
          changed.map(async (entry) => {
            const doc = JSON.parse(entry.text);
            await deserializeDocAttachments(doc);
            return doc;
          }),
        );
        const last = lastOfArray(changed);
        return { documents, checkpoint: last ? { at: last.at } : checkpoint };
      },
    },
  });
  sync.error$.subscribe((error) => errors.push(String(error.message)));
  return { db, collection, sync, errors };
}

function inDrive() {
  const file = JSON.parse(drive.get('focaccia').text);
  return { title: file.title, base64InFile: typeof file._attachments_data?.picture === 'string' };
}

const a = await device('a');
const recipe = await a.collection.insert({ id: 'focaccia', title: 'Focaccia' });
await recipe.putAttachment({
  id: 'picture',
  type: 'image/jpeg',
  data: new Blob([new Uint8Array(3000).fill(7)], { type: 'image/jpeg' }),
});
await a.sync.awaitInitialReplication();
console.log('after adding the picture', inDrive());

const stored = await a.collection.findOne('focaccia').exec(true);
await stored.incrementalPatch({ title: 'Focaccia, renamed' });
await a.sync.awaitInSync();
console.log('after renaming the recipe', inDrive());

const c = await device('c');
await c.sync.awaitInitialReplication();
await new Promise((resolve) => setTimeout(resolve, 200));
console.log(
  'new device holds the recipe',
  (await c.collection.findOne('focaccia').exec()) !== null,
);
console.log('new device errors', c.errors);

await Promise.all([a.sync.cancel(), c.sync.cancel()]);
await Promise.all([a.db.close(), c.db.close()]);
```

</details>

## Not checked

- Nothing here was run against Google Drive itself. The run above replaces Drive with a stand-in.
- What Drive does with a simple or multipart upload over 5 MB.
- Real picture sizes. They depend on how Rosa would resize and encode a picture, which this ticket does not cover.
- Blob storage in each browser's IndexedDB. It was run only on `fake-indexeddb` in Node.
- Whether `persist()` exempts a site from Safari's seven-day rule.

## Sources

RxDB 17.6.0 source, in `node_modules/rxdb/`:

- `src/plugins/storage-dexie/`: `dexie-helper.ts`, `rx-storage-instance-dexie.ts`, `dexie-query.ts`
- `src/plugins/attachments/`: `index.ts`, `attachments-utils.ts`
- `src/plugins/replication-google-drive/`: `index.ts`, `init.ts`, `upstream.ts`, `downstream.ts`, `document-handling.ts`, `google-drive-helper.ts`, `transaction.ts`, `signaling.ts`, `google-drive-types.ts`
- `src/replication-protocol/`: `helper.ts`, `upstream.ts`, `downstream.ts`, `conflicts.ts`, `meta-instance.ts`, `default-conflict-handler.ts`
- `src/plugins/replication/index.ts`, `src/rx-storage-helper.ts`, `src/rx-collection.ts`, `src/rx-document.ts`, `src/rx-database.ts`, `src/types/rx-storage.d.ts`, `src/types/rx-schema.d.ts`
- `src/plugins/test-utils/replication-base-test-suite.ts`
- `CHANGELOG.md`

Documentation and browser sources:

- RxDB: [Attachments](https://rxdb.info/rx-attachment.html), [Google Drive replication](https://rxdb.info/replication-google-drive.html), [Dexie storage](https://rxdb.info/rx-storage-dexie.html)
- Google: [Upload file data](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [files.delete](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/delete)
- MDN: [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- WebKit: [Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- Chromium: [quota_settings.cc](https://chromium.googlesource.com/chromium/src/+/main/storage/browser/quota/quota_settings.cc), [quota_features.cc](https://chromium.googlesource.com/chromium/src/+/main/storage/browser/quota/quota_features.cc), [blink-dev: Predictable reported storage quota](https://groups.google.com/a/chromium.org/g/blink-dev/c/7q0YGQNVkjs)
- web.dev: [Persistent storage](https://web.dev/articles/persistent-storage)
