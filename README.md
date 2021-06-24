# obsidian-switcher-plus
An [Obsidian.md](https://obsidian.md/) plugin that extends the functionality of the builtin "Quick Switcher". This plugin makes it possible to navigate through all open editor panes. As well as, to navigate to any Symbols (Headings, Hashtags, Links, Embeddings) contained in a note directly from the Quick Switcher.

## Features

This plugin adds a few enhanced capabilities to the built in "Quick Switcher" functionality. These enhanced features are also accessible via Obsidian global commands.

### Symbol Navigation (Headings,  Hastags, Links, Embeddings)

View, filter, and navigate to any symbol (Headings, Hashtags, Links, Embedding) in a file directly from the Quick Switcher.
  * **For the currently open and focused pane:** symbols can be viewed directly by using the `Open in Symbol Mode` global hotkey (see below).
  * **For any other file (open or not):** symbols can be viewed by opening Quick Switcher++, typing some characters to filter and/or using the arrow keys to select (highlight) the file of interest. Then, once the file of interest is selected/highlighted, type the `@` (default) character to view the symbols for the file of interest. ![symbol search preview](https://raw.githubusercontent.com/darlal/obsidian-switcher-plus/master/demo/symbolsearch.png)
  * Symbols can also be configured to display in indented, outline form. ![symbol outline preview](https://raw.githubusercontent.com/darlal/obsidian-switcher-plus/master/demo/symbol-outline.png)

### Navigate between open editors

View, and filter all of the currently open files, and navigate to any of them from Quick Switcher++ by using the default `edt ` command. Note: Symbol search works in this mode as well, so you can use both modes together e.g. `edt @` ![editor search preview](https://raw.githubusercontent.com/darlal/obsidian-switcher-plus/master/demo/edt-command.png)
The default builtin Quick Switcher behavior is used when no commands are present.

## Installation

### From Obsidian

From Obsidian v0.9.10, this plugin can be activated from within Obsidian:
- Open Settings > Third-party plugin
- Make sure Safe mode is **off**
- Click Browse community plugins
- Search for "Quick Switcher++"
- Click the "Install" button
- Once installed, close the community plugins window
- Under the "Installed plugins" section, enable Quick Switcher++

### From Github

- Download the [Latest release distribution](https://github.com/darlal/obsidian-switcher-plus/releases)
- Extract the the contents of the distribution zip file to your vault's plugins folder: `<vault>/.obsidian/plugins/`
Note: On MacOs the `.obsidian` folder may be hidden by default.
- Reload Obsidian
- Open Settings, third-party plugins, make sure safe mode is off and enable "Quick Switcher++" from there.

## Notes

* This plugin very much experimental at the moment, use it at your own risk. It's only been tested on MacOS, other platforms may have issues.

## Giving Thanks 🙏

If this project has been useful to you, give thanks to support its continued development and maintenance. Any contribution towards a cup of ☕ or 🍺 is greatly appreciated. Thank you!
[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >](https://www.buymeacoffee.com/darlal)
