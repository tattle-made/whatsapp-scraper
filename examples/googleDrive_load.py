from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive
import pandas as pd
import re
from datetime import datetime, date
import s3_mongo_helper
from dotenv import load_dotenv
load_dotenv() 

gauth = GoogleAuth()
gauth.LocalWebserverAuth() # client_secrets.json need to be in the same directory as the script
drive = GoogleDrive(gauth)


# # View all folders and file in your Google Drive
fileList = drive.ListFile({'q': "'root' in parents and trashed=false"}).GetList()
# for file in fileList:
#   print('Title: %s, ID: %s' % (file['title'], file['id']))
#   # Get the folder ID that you want
#   if("WhatsApp Chat with" in file['title']):
#       fileID = file['id']
#       file.GetContentFile('dump.txt')
      
# '''process text file:
# ''' 



f= open("dump.txt","r")

df = pd.DataFrame(columns = ["timestamp", "number", "filename", "s3URL","scrapedTime","type"])
i = 0
lines = f.readlines()
for x in lines:
    if("(file attached)" in x):
        #print(x)
        
        # Extract timestamp
        ts = re.search('(.+?)(AM|PM)', x)
        #print(ts.group(1))
        ts = ts.group(1)

        # Extract number
        number = re.search('-(.+?):', x)
        #print(number.group(1).replace(" ", ""))
        number = number.group(1).replace(" ", "")

        # Extract filename
        fn = re.search('^(?:[^:]*\:){2}(.+?)\(file attached', x)
        #print(fn.group(1).strip())
        fn = fn.group(1).strip()
        
        temp = pd.DataFrame({"timestamp":[ts],
                           "number":[number],
                           "filename":[fn],
                           "s3URL":["NULL"],
                           "scrapedTime":["NULL"],
                           })
        #temp = pd.DataFrame([ts,number,fn,"NULL"])
        print(temp)
        ## Append rows
        df = df.append(temp,ignore_index = True)
           
print(df)


fileTab = pd.DataFrame(fileList)
fileTab.to_csv('temp.csv')

''' Join fileTab with df '''
test = pd.merge(df, fileTab, how='inner', left_on='filename', right_on='title')
print(test)

for index, row in test.iterrows():
    file_block = drive.CreateFile({'id': row["id"]})
    filename = row["filename"]
    print(filename)
    file_block.GetContentFile(filename)
    #s3_mongo_helper.upload_to_s3(s3,file=filename,filename=filename,bucket=bucket,content_type=row["mimeType"])

coll = s3_mongo_helper.initialize_mongo()
for i in df.to_dict("records"):
    s3_mongo_helper.upload_to_mongo(data=i, coll=coll) 


