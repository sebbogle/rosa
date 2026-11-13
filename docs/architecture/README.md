# Rosa architecture

Rosa is a cookbook that runs wholly in the browser. A cook writes recipes, files them in folders and reads them, one or two at a time. The recipes are stored on the device, and nothing runs on a server: a static host hands the browser Rosa's files and that is all. Once those files have arrived, Rosa opens and works offline.

A cook can also keep one more copy of the cookbook in their own Google Drive and sync each device with it. Sync is optional and set up per device. A device that never syncs works the same in every other way.

The pages use the words defined in the [glossary](../GLOSSARY.md).

## Pages

1. [External dependencies](dependencies.md): what Rosa is built on and talks to, and what it uses each for.
2. [Module map](modules.md): the nine areas of the code, what each is responsible for, and which depend on which.
3. [Data model](data-model.md): the shape of a recipe, the rules it follows, and where copies of the cookbook live.
4. [Open set](open-set.md): which recipes are open on a device, what a side with no recipe shows, and what happens when the app opens.
5. [Editing](editing.md): the editor session, writing a new recipe, and editing a stored one.
6. [Drive](drive.md): where a device stands with Drive, syncing, crossed edits, and clearing Drive and putting recipes back.
7. [Export and import](export-and-import.md): how recipes leave a device as files and come back.
