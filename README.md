# SpoolTracker

# THIS PLUGIN WAS MADE COMPLETLY BY AI USE AT YOUR OWN RISK #

A plugin for OctoPrint that helps track how much filament is left on the currently loaded spool. Perfect for farm usage, it automatically tracks filament usage and remaining amount using gcode from the slicer.

## Features

- Track filament amount remaining on spools
- Simple and easy to use sidebar gui
- Display filament type and color
- Save and load spool profiles
- Automatic updates based on G-code analysis
- Support for common filament types (PLA, ABS, PETG, etc.)

### Manual Installation
1. Download the latest release from the [releases page](https://github.com/thatguymendel/OctoPrint-SpoolTracker/releases or dowload and zip yourself
2. Upload the ZIP file through OctoPrint's Plugin Manager

## Setup

1. Install the plugin and restart OctoPrint
2. Add your spool through the SpoolTracker sidebar
3. The plugin will automatically track filament usage using gcode input from your slicer

### Adding a New Spool
1. Click "Add Spool" in the SpoolTracker sidebar
2. Enter the spool details:
   - Name
   - Filament type
   - Color
   - Initial weight
   - Brand (optional)
3. Click Save

### Updating Filament Amount
- The plugin automatically updates filament amounts after each print

### G-code Integration
The plugin looks for the following line at the end of your G-code file:
```
; filament used [g] = X.XX
```
Make sure your slicer includes this information in the G-code output.


## License

This plugin is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Here's how you can help:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Credits

- Developed by [thatguymendel](https://github.com/thatguymendel) and cursor
