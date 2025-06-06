$(function() {
    /**
     * Ensure the Spool-Tracker sidebar is directly under the State sidebar,
     * even if OctoPrint (or another plugin) changes the sidebar afterwards.
     *
     * Works in three layers:
     *   1.  quick one-shot attempt as early as possible;
     *   2.  short polling fallback (handles late Knockout injections);
     *   3.  MutationObserver keeps the order if a plugin re-inserts items later.
     */
    (function () {
        /* ----------  core move routine  ---------- */
        function moveSpoolTracker() {
            const state = document.getElementById("state_wrapper");
            const spool = document.getElementById("sidebar_plugin_spooltracker_wrapper");

            if (state && spool && state.nextSibling !== spool) {
                state.parentNode.insertBefore(spool, state.nextSibling);
                return true;          // success!
            }
            return false;             // try again later
        }

        /* ----------  1️⃣ try once ASAP  ---------- */
        if (moveSpoolTracker()) return;  // already done

        /* ----------  2️⃣ fallback: retry every 300 ms, up to 10 s  ---------- */
        let tries = 0, maxTries = 34;    // ~10 s total
        const timer = setInterval(() => {
            if (moveSpoolTracker() || ++tries > maxTries) clearInterval(timer);
        }, 300);

        /* ----------  3️⃣ observer: guard against future DOM changes  ---------- */
        document.addEventListener("DOMContentLoaded", () => {
            const sidebar = document.getElementById("sidebar");
            if (!sidebar) return;

            new MutationObserver(moveSpoolTracker)
                .observe(sidebar, { childList: true });
        });
    })();

    function SpoolTrackerSidebarViewModel(parameters) {
        var self = this;

        self.remainingG = ko.observable(0);
        self.spoolCapacityG = ko.observable(0);
        self.filamentType = ko.observable("PLA");
        self.color = ko.observable("#000000");
        self.manufacturer = ko.observable("");
        self.profiles = ko.observableArray([]);

        // Form data observables
        self.formSpoolCapacity = ko.observable("");
        self.formFilamentType = ko.observable("PLA");
        self.formColor = ko.observable("#000000");
        self.formManufacturer = ko.observable("");
        self.formProfileName = ko.observable("");
        self.selectedProfile = ko.observable("");

        // Computed observable for formatted remaining filament
        self.formattedRemaining = ko.computed(function() {
            return self.remainingG().toFixed(1) + "g";
        });

        self.showNewSpoolDialog = function() {
            console.log("Opening new spool dialog");
            // Don't reset form values anymore, let them persist
            self.updateColorPreview();
            
            // Use jQuery to show the modal
            var $modal = $("#new_spool_dialog");
            if ($modal.length) {
                $modal.modal("show");
            } else {
                console.error("Modal element not found");
            }
        };

        // Update color preview when color picker changes
        self.updateColorPreview = function() {
            var color = self.formColor();
            $("#color_preview").css("background-color", color);
        };

        self.loadProfile = function(profileName) {
            console.log("Loading profile:", profileName);
            if (!profileName) return;
            
            var profile = self.profiles().find(function(p) { return p.name === profileName; });
            if (profile) {
                console.log("Found profile:", profile);
                self.formSpoolCapacity(profile.spool_capacity_g);
                self.formFilamentType(profile.filament_type);
                self.formColor(profile.color);
                self.formManufacturer(profile.manufacturer);
                self.updateColorPreview();
            } else {
                console.error("Profile not found:", profileName);
            }
        };

        // Add a subscription to selectedProfile changes
        self.selectedProfile.subscribe(function(newValue) {
            console.log("Profile selection changed to:", newValue);
            self.loadProfile(newValue);
        });

        self.saveProfile = function() {
            var profileName = self.formProfileName().trim();
            if (!profileName) {
                new PNotify({
                    title: "Error",
                    text: "Please enter a profile name",
                    type: "error"
                });
                return;
            }

            var profileData = {
                name: profileName,
                spool_capacity_g: parseFloat(self.formSpoolCapacity()),
                filament_type: self.formFilamentType(),
                color: self.formColor(),
                manufacturer: self.formManufacturer()
            };

            $.ajax({
                url: API_BASEURL + "plugin/spooltracker",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    command: "save_profile",
                    data: profileData
                }),
                contentType: "application/json; charset=UTF-8",
                success: function(response) {
                    if (response.success) {
                        self.profiles(Object.keys(response.profiles).map(function(name) {
                            return { name: name, ...response.profiles[name] };
                        }));
                        new PNotify({
                            title: "Success",
                            text: "Profile saved successfully",
                            type: "success"
                        });
                        self.formProfileName("");
                    } else {
                        new PNotify({
                            title: "Error",
                            text: response.error || "Failed to save profile",
                            type: "error"
                        });
                    }
                },
                error: function(xhr, status, error) {
                    new PNotify({
                        title: "Error",
                        text: "Failed to save profile: " + error,
                        type: "error"
                    });
                }
            });
        };

        self.deleteProfile = function() {
            var profileName = self.selectedProfile();
            if (!profileName) {
                new PNotify({
                    title: "Error",
                    text: "Please select a profile to delete",
                    type: "error"
                });
                return;
            }

            if (!confirm("Are you sure you want to delete the profile '" + profileName + "'?")) {
                return;
            }

            $.ajax({
                url: API_BASEURL + "plugin/spooltracker",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    command: "delete_profile",
                    data: { name: profileName }
                }),
                contentType: "application/json; charset=UTF-8",
                success: function(response) {
                    if (response.success) {
                        self.profiles(Object.keys(response.profiles).map(function(name) {
                            return { name: name, ...response.profiles[name] };
                        }));
                        self.selectedProfile("");
                        new PNotify({
                            title: "Success",
                            text: "Profile deleted successfully",
                            type: "success"
                        });
                    } else {
                        new PNotify({
                            title: "Error",
                            text: response.error || "Failed to delete profile",
                            type: "error"
                        });
                    }
                },
                error: function(xhr, status, error) {
                    new PNotify({
                        title: "Error",
                        text: "Failed to delete profile: " + error,
                        type: "error"
                    });
                }
            });
        };

        // Add a function to reset form values
        self.resetForm = function() {
            self.formSpoolCapacity("");
            self.formFilamentType("PLA");
            self.formColor("#000000");
            self.formManufacturer("");
            self.formProfileName("");
            self.selectedProfile("");
            self.updateColorPreview();
        };

        self.submitNewSpool = function() {
            var formData = {
                spool_capacity_g: parseFloat(self.formSpoolCapacity()),
                filament_type: self.formFilamentType(),
                color: self.formColor(),
                manufacturer: self.formManufacturer()
            };

            // Validate the data
            if (isNaN(formData.spool_capacity_g) || formData.spool_capacity_g <= 0) {
                new PNotify({
                    title: "Error",
                    text: "Spool capacity must be greater than 0",
                    type: "error"
                });
                return;
            }

            $.ajax({
                url: API_BASEURL + "plugin/spooltracker",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    command: "load_new_spool",
                    data: formData
                }),
                contentType: "application/json; charset=UTF-8",
                success: function(response) {
                    if (response.success) {
                        $("#new_spool_dialog").modal("hide");
                        new PNotify({
                            title: "Success",
                            text: "New spool loaded successfully",
                            type: "success"
                        });
                    } else {
                        new PNotify({
                            title: "Error",
                            text: response.error || "Failed to load new spool",
                            type: "error"
                        });
                    }
                },
                error: function(xhr, status, error) {
                    new PNotify({
                        title: "Error",
                        text: "Failed to load new spool: " + error,
                        type: "error"
                    });
                }
            });
        };

        // Add CSS for the color preview in the sidebar
        $("<style>")
            .text(`
                .spooltracker-sidebar .color-preview {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 1px solid #ccc;
                    margin-right: 5px;
                    vertical-align: middle;
                }
            `)
            .appendTo("head");

        self.onStartup = function() {
            console.log("SpoolTracker sidebar starting up");
            
            // Move modal to body and initialize it
            var $modal = $("#new_spool_dialog");
            if ($modal.length) {
                // Remove any existing modal instances
                $modal.removeData('bs.modal');
                // Move modal to body
                $modal.appendTo("body");
                // Initialize modal with proper Bootstrap behavior
                $modal.modal({
                    show: false,
                    backdrop: true,
                    keyboard: true
                });
                // Apply bindings to modal
                ko.applyBindings(self, $modal[0]);
                console.log("Modal initialized and moved to body");
            } else {
                console.error("Modal element not found");
            }
            
            // Load initial data
            $.ajax({
                url: API_BASEURL + "plugin/spooltracker",
                type: "GET",
                dataType: "json",
                success: function(data) {
                    console.log("Loaded initial data:", data);
                    self.remainingG(data.remaining_g);
                    self.spoolCapacityG(data.spool_capacity_g);
                    self.filamentType(data.filament_type);
                    self.color(data.color || "#000000");
                    self.manufacturer(data.manufacturer);
                    
                    // Load profiles
                    if (data.profiles) {
                        var profileArray = Object.keys(data.profiles).map(function(name) {
                            return { 
                                name: name, 
                                spool_capacity_g: data.profiles[name].spool_capacity_g,
                                filament_type: data.profiles[name].filament_type,
                                color: data.profiles[name].color,
                                manufacturer: data.profiles[name].manufacturer
                            };
                        });
                        console.log("Loaded profiles:", profileArray);
                        self.profiles(profileArray);
                    }
                }
            });

            // Initialize color preview
            self.updateColorPreview();
        };

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin !== "spooltracker") {
                return;
            }

            console.log("Received plugin message:", data);

            if (data.remaining_g !== undefined) {
                self.remainingG(data.remaining_g);
            }
            if (data.spool_capacity_g !== undefined) {
                self.spoolCapacityG(data.spool_capacity_g);
            }
            if (data.filament_type !== undefined) {
                self.filamentType(data.filament_type);
            }
            if (data.color !== undefined) {
                self.color(data.color);
            }
            if (data.manufacturer !== undefined) {
                self.manufacturer(data.manufacturer);
            }
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: SpoolTrackerSidebarViewModel,
        dependencies: [],
        elements: ["#sidebar_plugin_spooltracker"],
        onstartup: true
    });
}); 