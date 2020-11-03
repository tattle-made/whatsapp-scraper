Tattle WhatsApp dump processor.

Use this to convert WhatsApp dumps into structured data. This script will either upload the data and media to Tattle's data storage (MongoDB and S3) or save files locally depending on command line arguments.

### Basic usage

    ./whatapp_scaper.py path/to/creds.json drive.google.com/folders/drive_id --local --verbose

For help on the CLI arguments, try `./whatsapp_scaper.py --help`

There are two options for authentication. Both generate a json file which needs to be passed in:
1. Individual account option: 
    Go here on your google account and enable the drive API:
    https://developers.google.com/drive/api/v3/quickstart/python
    This will give you a credentials.json file.
2. Service account option:
    Create a service account here:
    https://console.developers.google.com/iam-admin/serviceaccounts
    After creating, click "create key" on the tab to right and download.
    IMPORTANT: You will then need to share the drive directory with the service account email.

You will need to set a SCRAPER_SALT environment variable for
consistent anonymization.

### Testing

    ./test.sh
