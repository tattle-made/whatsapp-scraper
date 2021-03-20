**Before using this code, kindly review the check-list for [responsible data collection practices.](https://tattle.co.in/products/closed-messaging-checklist/)**

**Tattle's design decision for secure data collection are listed on the [Tattle site.](https://tattle.co.in/products/whatsapp-archiver)**

Tattle WhatsApp dump processor.

Use this to convert WhatsApp dumps into structured data. This script will either upload the data and media to Tattle's data storage (MongoDB and S3) or save files locally depending on command line arguments.


### Setup

    pip3 install -r requirements.txt


### Basic usage

    ./whatsapp_scraper.py path/to/creds.json drive.google.com/folders/drive_id --local --verbose

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

### MongoDB + S3 usage

If you want to save data to MongoDB and media to S3, you will need a .env file. A template has been provided for you.

    cp env_template .env

Add your real credentials to the .env file. Then, before running whatsapp_scraper.py, run

    source .env

### Testing

    ./test.sh

The test.sh file uses the coverage python module. You can see the code coverage with

    firefox htmlcov/index.html
