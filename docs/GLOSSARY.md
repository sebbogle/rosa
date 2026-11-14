# Rosa

This is an overview of the terminology that Rosa uses. The [architecture docs](architecture/README.md) have an index that leads to the page where each thing is described.

## Language

### The cookbook

**User**:
The person using Rosa.
_Avoid_: cook

**Cookbook**:
All the recipes a user keeps in Rosa. Each device holds its own copy, and Drive holds one more once the user syncs.
_Avoid_: database, library, collection

**Device**:
One browser on one machine, holding its own copy of the cookbook. Two browsers on the same laptop are two devices.
_Avoid_: browser, client, machine

**Stored**:
Said of a recipe that is in the cookbook. A new recipe is stored once it has a title, and edits to a stored recipe are stored as they are made.
_Avoid_: saved, kept, persisted

**Sizing**:
A named version of a recipe's quantities, such as "2 people" or "Large tin". Every recipe has at least one, and each ingredient has one quantity per sizing.
_Avoid_: serving, scale, variant

**Folder**:
One named place in the tree of recipes. A folder exists only while some recipe's folder path runs through it, so there are no empty folders.
_Avoid_: directory, category

**Folder path**:
The list of folder names on a recipe, from the top of the tree down. A recipe with an empty path sits under "No folder".
_Avoid_: placement

**Deletion marker**:
The record a deleted recipe leaves behind in a copy of the cookbook. It carries the deletion to other devices through sync, and it tells an import that the recipe was deleted, so that Rosa asks before bringing it back.
_Avoid_: tombstone

**Gate**:
The check a recipe from outside the device passes before it enters the cookbook. It is strict with imported files, which it can refuse, and lenient with recipes arriving from Drive, which it always accepts.
_Avoid_: validator, schema

**Standalone page**:
An export of one or more recipes as a single HTML file that opens without Rosa. It is for reading and can't be imported back.
_Avoid_: HTML export

### Reading

**Open set**:
Everything about which recipes are open on a device: the sides, the tabs in each, which side is focused, and which sizing each open recipe shows. A recipe is open in at most one side.
_Avoid_: tabs (for the whole), tab state

**Side**:
One of at most two columns that show recipes next to each other. Each side has its own tabs.
_Avoid_: pane, column, split

**Focused side**:
The side the user is working in. The URL describes it and the keyboard acts on it.
_Avoid_: active side

**Active tab**:
The tab a side is showing. Each side has at most one.
_Avoid_: focused tab, current tab

**Kept tab**:
A tab that stays open until the user closes it.
_Avoid_: pinned tab

**Preview tab**:
A side's one temporary tab. The next recipe the user opens replaces it, unless the user keeps it first.
_Avoid_: temporary tab

**Resting state**:
What a side shows when it has no recipe to show: a line saying why, and sometimes a control. It is a ladder with six cases.
_Avoid_: empty state, placeholder

**Ladder**:
A state worked out afresh from a set of facts, by checking its cases in a fixed order and taking the first that holds. The resting state and Drive state are ladders, and neither has transitions.
_Avoid_: state machine

### Editing

**Editor session**:
One spell of editing a recipe, from opening the editor to closing it. It remembers the recipe as it was on opening, so the user can revert, and it is the only place a new recipe exists until that recipe is stored.
_Avoid_: draft, edit mode

### Drive

**Sync**:
Bringing a device's copy of the cookbook and Drive's copy into agreement, in both directions. It is optional and set up per device.
_Avoid_: replication, backup, upload

**Drive folder**:
The folder named `rosa` in the user's Google Drive, which holds Drive's copy of the cookbook. Rosa creates it and can see nothing else in the user's Drive.
_Avoid_: folder (on its own), remote

**Drive state**:
Where a device stands with Drive at this moment: one of eleven states, from never used to up to date. It is a ladder, and it belongs to the device, not to the cookbook.
_Avoid_: sync status, connection state

**Auth token**:
What Google gives a device when the user signs in, letting it reach the Drive folder. It expires after about an hour, and a device syncs only while it holds a valid one.
_Avoid_: the hour, between hours, session, permission

**First fetch**:
A device's first complete sync with a Drive folder, which brings Drive's copy of the cookbook onto the device. Until it finishes, the device may not hold every recipe.
_Avoid_: first pull, initial sync

**Crossed edits**:
Changes made to the same recipe on two devices with no sync in between. They are settled part by part when the second device syncs.
_Avoid_: conflict, merge conflict

**Part**:
One of the eight pieces of a recipe that crossed edits are settled by: title, tags, folder path, source, notes, prep, method, and ingredients together with sizings. A part is always taken whole from one device or the other.
_Avoid_: field group

**Last-agreed state**:
A recipe as it stood when a device and Drive last held the same version of it. A part counts as changed on a device if it differs from this.
_Avoid_: assumed master, base

**Clear Drive**:
The action that deletes the Drive folder for good and disconnects the device it was pressed on. Every device keeps its own copy of the cookbook.
_Avoid_: reset, delete cookbook

**Put back**:
The action that fills a new Drive folder from one device's copy of the cookbook, offered after Drive has been cleared.
_Avoid_: restore, re-upload
