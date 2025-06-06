# SpoolTracker

# THIS PLUGIN WAS MADE COMPLETLY BY AI USE AT YOUR OWN RISK #

A plugin for OctoPrint that helps track and manage 3D printer filament spools. Perfect for farm usage, it automatically tracks filament usage and remaining amount.

## Features

- Track filament amount remaining on spools
- Display filament type and color
- Save and load spool profiles
- Automatic updates based on G-code analysis
- Support for common filament types (PLA, ABS, PETG, etc.)

## Installation

### Via Plugin Manager
1. Open OctoPrint's settings
2. Navigate to Plugin Manager
3. Click "Get More..."
4. Search for "SpoolTracker"
5. Click Install

### Manual Installation
1. Download the latest release from the [releases page](https://github.com/thatguymendel/OctoPrint-SpoolTracker/releases)
2. Upload the ZIP file through OctoPrint's Plugin Manager

## Setup

1. Install the plugin and restart OctoPrint
2. Add your spool through the SpoolTracker sidebar
3. The plugin will automatically track filament usage

### Adding a New Spool
1. Click "Add Spool" in the SpoolTracker sidebar
2. Enter the spool details:
   - Name
   - Filament type
   - Color
   - Initial weight
   - Brand (optional)
   - Notes (optional)
3. Click Save

### Updating Filament Amount
- The plugin automatically updates filament amounts after each print
- You can also manually adjust the amount in the spool settings

### G-code Integration
The plugin looks for the following line at the end of your G-code files:
```
; filament used [g] = X.XX
```
Make sure your slicer includes this information in the G-code output.

## Support

If you encounter any issues:
1. Check the [documentation](https://github.com/thatguymendel/OctoPrint-SpoolTracker/wiki)
2. Search for [existing issues](https://github.com/thatguymendel/OctoPrint-SpoolTracker/issues)
3. Create a new issue if needed

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
- Built for the OctoPrint community 
