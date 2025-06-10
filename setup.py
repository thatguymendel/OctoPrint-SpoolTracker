from setuptools import setup

plugin_identifier = "spooltracker"
plugin_package = "octoprint_spooltracker"
plugin_name = "OctoPrint-SpoolTracker"
plugin_version = "1.0.8"
plugin_description = "A simple spool weight tracker for OctoPrint"
plugin_author = "thatguymendel"
plugin_author_email = "thatmmh@gmail.com"
plugin_url = "https://github.com/yourusername/OctoPrint-SpoolTracker"
plugin_license = "AGPLv3"
plugin_requires = []
plugin_additional_data = []
plugin_additional_packages = []
plugin_ignored_packages = []
additional_setup_requires = []
additional_urls = []
package_data = {
    "octoprint_spooltracker": [
        "static/js/*.js",
        "static/css/*.css",
        "templates/*.jinja2"
    ]
}

setup(
    name=plugin_name,
    version=plugin_version,
    description=plugin_description,
    author=plugin_author,
    author_email=plugin_author_email,
    url=plugin_url,
    license=plugin_license,
    packages=[plugin_package],
    package_data=package_data,
    include_package_data=True,
    install_requires=plugin_requires,
    dependency_links=additional_urls,
    python_requires=">=3.7,<4",
    setup_requires=additional_setup_requires,
    zip_safe=False,
    entry_points={
        "octoprint.plugin": ["spooltracker = octoprint_spooltracker"]
    }
)
