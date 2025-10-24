After following the install instructions in the python code comments and changed the necessary parts in the app.config to connect to your mysql database. 

Run the command: flask --app connect  run
This command will create and run the app giving you a link/address to follow which is our current webpage. 



** Not Necessary for running just an explanation for the inserts: 

In the mysql template for setting up the template towards the bottom are 3 inserts. 
These were necessary to insert for testing because when activating a patient account an Insurance Id is needed to already be in the database to be able to create a patient account.

The prescriber also needed a dummy insert because when prescribing a medication a prescriber ID is needed to already be in the database to be able to prescribe an ID, we will probably change this to automatically create a prescriber when creating a Staff account.  

The drug insert was also need to be able to create a prescription with a Drug ID already in the system so a dummy one was created. 

With the 3 inserts it should allow you to be able to create a patient account, create a staff account, login, prescribe the dummy medication since it is the only one in our database currently. 

Also we currently have staff and patient id's to be auto incremented so the first staff created will be id 1 and so on as well as the patient id's. 

**

