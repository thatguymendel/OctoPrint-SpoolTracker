import octoprint.plugin
from octoprint.events import Events
import flask
from flask import abort, jsonify
from octoprint.access.permissions import Permissions
from octoprint.access.groups import USER_GROUP, ADMIN_GROUP
import logging
import json
import re
import os

# ─────────────────────────────────────────────────────────────
# Pick the tightest built-ins that fit:
READ_PERMISSION  = Permissions.CONTROL   # any user allowed to control a print
WRITE_PERMISSION = Permissions.ADMIN     # only admins may change spools
# ─────────────────────────────────────────────────────────────

class SpoolTrackerPlugin(octoprint.plugin.SettingsPlugin,
                        octoprint.plugin.EventHandlerPlugin,
                        octoprint.plugin.SimpleApiPlugin,
                        octoprint.plugin.AssetPlugin,
                        octoprint.plugin.TemplatePlugin
                        ):
    
    # Default densities in g/cm³ for common filament types
    FILAMENT_DENSITIES = {
        "PLA": 1.24,
        "ABS": 1.04,
        "PETG": 1.27,
        "TPU": 1.21,
        "Nylon": 1.13,
        "PC": 1.19,
        "PVA": 1.23,
        "HIPS": 1.03
    }
    
    def get_settings_defaults(self):
        return {
            "spool_capacity_g": 0,      # full weight of this spool in grams
            "remaining_g": 0,           # what's left right now in grams
            "filament_type": "PLA",     # default filament type
            "color": "#000000",         # filament color
            "manufacturer": "",         # filament manufacturer
            "profiles": {}              # stored filament profiles
        }

    def _filament_used_g(self, payload):
        try:
            # Get the full path to the G-code file
            file_path = self._file_manager.path_on_disk(payload["origin"], payload["path"])
            self._logger.info(f"Reading G-code file: {file_path}")

            if not os.path.exists(file_path):
                self._logger.error(f"G-code file not found: {file_path}")
                return 0

            # Get file size and determine read position
            file_size = os.path.getsize(file_path)
            read_size = min(32768, file_size)  # Read last 32KB or entire file if smaller
            start_pos = max(0, file_size - read_size)

            # Read the end of the file
            with open(file_path, 'rb') as f:
                f.seek(start_pos)
                content = f.read(read_size).decode('utf-8', errors='ignore')
                self._logger.info(f"Read {len(content)} bytes from file")

            # Search for filament usage line
            pattern = r";\s*filament used \[g\]\s*=\s*([0-9.]+)"
            match = re.search(pattern, content)
            
            if match:
                filament_used = float(match.group(1))
                self._logger.info(f"Found filament usage: {filament_used}g")
                return filament_used
            else:
                self._logger.warning("No filament usage found in G-code file")
                return 0

        except Exception as e:
            self._logger.error(f"Error reading filament usage from G-code: {str(e)}")
            return 0

    def on_event(self, event, payload):
        if event == Events.PRINT_DONE:        # only update on successful completion
            try:
                used = self._filament_used_g(payload)
                if used > 0:
                    current_remaining = self._settings.get_float(["remaining_g"])
                    new_remaining = max(0, current_remaining - used)
                    
                    self._logger.info(f"Updating remaining filament: {current_remaining:.2f}g - {used:.2f}g = {new_remaining:.2f}g")
                    
                    self._settings.set_float(["remaining_g"], new_remaining)
                    self._settings.save()

                    # push an update to the web UI
                    self._plugin_manager.send_plugin_message(
                        self._identifier,
                        {
                            "remaining_g": new_remaining,
                            "color": self._settings.get(["color"]),
                            "manufacturer": self._settings.get(["manufacturer"])
                        }
                    )
            except Exception as e:
                self._logger.error(f"Error processing print completion: {str(e)}")

    def on_api_get(self, request):
        if not READ_PERMISSION.can():
            abort(403)
        return flask.jsonify(
            remaining_g=self._settings.get_float(["remaining_g"]),
            spool_capacity_g=self._settings.get_float(["spool_capacity_g"]),
            filament_type=self._settings.get(["filament_type"]),
            color=self._settings.get(["color"]),
            manufacturer=self._settings.get(["manufacturer"]),
            profiles=self._settings.get(["profiles"])
        )

    def on_api_command(self, command, data):
        self._logger.info(f"Received API command: {command}")
        self._logger.info(f"Command data type: {type(data)}")
        self._logger.info(f"Command data: {data}")
        
        if command == "load_new_spool":
            if not WRITE_PERMISSION.can():
                abort(403)
            try:
                # Get the new spool data from the nested 'data' field
                spool_data = data.get("data", {})
                self._logger.info(f"Spool data: {spool_data}")
                
                spool_capacity_g = float(spool_data.get("spool_capacity_g", 0))
                filament_type = spool_data.get("filament_type", "PLA")
                color = spool_data.get("color", "#000000")
                manufacturer = spool_data.get("manufacturer", "")

                self._logger.info(f"Parsed values - capacity: {spool_capacity_g} ({type(spool_capacity_g)}), type: {filament_type}, color: {color}, manufacturer: {manufacturer}")

                # Validate the data
                if spool_capacity_g <= 0:
                    self._logger.error(f"Invalid spool capacity: {spool_capacity_g}")
                    return flask.jsonify(error="Spool capacity must be greater than 0"), 400

                # Update the settings
                self._settings.set_float(["spool_capacity_g"], spool_capacity_g)
                self._settings.set_float(["remaining_g"], spool_capacity_g)
                self._settings.set(["filament_type"], filament_type)
                self._settings.set(["color"], color)
                self._settings.set(["manufacturer"], manufacturer)
                self._settings.save()

                self._logger.info("Settings updated successfully")

                # Notify the UI
                self._plugin_manager.send_plugin_message(
                    self._identifier,
                    {
                        "remaining_g": spool_capacity_g,
                        "spool_capacity_g": spool_capacity_g,
                        "filament_type": filament_type,
                        "color": color,
                        "manufacturer": manufacturer
                    }
                )

                return flask.jsonify(success=True)
            except (ValueError, TypeError) as e:
                self._logger.error(f"Error processing new spool data: {str(e)}")
                return flask.jsonify(error=str(e)), 400
                
        elif command == "save_profile":
            if not WRITE_PERMISSION.can():
                abort(403)
            try:
                profile_data = data.get("data", {})
                profile_name = profile_data.get("name", "").strip()
                
                if not profile_name:
                    return flask.jsonify(error="Profile name is required"), 400
                    
                # Get current profiles
                profiles = self._settings.get(["profiles"])
                
                # Add new profile
                profiles[profile_name] = {
                    "spool_capacity_g": float(profile_data.get("spool_capacity_g", 0)),
                    "filament_type": profile_data.get("filament_type", "PLA"),
                    "color": profile_data.get("color", "#000000"),
                    "manufacturer": profile_data.get("manufacturer", "")
                }
                
                # Save profiles
                self._settings.set(["profiles"], profiles)
                self._settings.save()
                
                return flask.jsonify(success=True, profiles=profiles)
                
            except Exception as e:
                self._logger.error(f"Error saving profile: {str(e)}")
                return flask.jsonify(error=str(e)), 400
                
        elif command == "delete_profile":
            if not WRITE_PERMISSION.can():
                abort(403)
            try:
                profile_name = data.get("data", {}).get("name", "").strip()
                
                if not profile_name:
                    return flask.jsonify(error="Profile name is required"), 400
                    
                # Get current profiles
                profiles = self._settings.get(["profiles"])
                
                # Remove profile
                if profile_name in profiles:
                    del profiles[profile_name]
                    self._settings.set(["profiles"], profiles)
                    self._settings.save()
                    
                return flask.jsonify(success=True, profiles=profiles)
                
            except Exception as e:
                self._logger.error(f"Error deleting profile: {str(e)}")
                return flask.jsonify(error=str(e)), 400

        return flask.jsonify(error="Unknown command"), 400

    def get_assets(self):
        return {
            "js": ["js/spooltracker_sidebar.js"],
            "css": ["css/spooltracker.css"],
            "less": []
        }
    
    def get_template_configs(self):
        return [
            dict(type="sidebar", name="Spool Tracker", template="spooltracker_sidebar.jinja2", icon="balance-scale"),
            dict(type="generic", template="spooltracker_modal.jinja2")
        ]

    def is_api_adminonly(self):
        return False

    def get_api_commands(self):
        return dict(
            load_new_spool=[],
            save_profile=[],
            delete_profile=[]
        )


__plugin_name__ = "Spool Tracker"
__plugin_pythoncompat__ = ">=3.7,<4"
__plugin_implementation__ = SpoolTrackerPlugin()
