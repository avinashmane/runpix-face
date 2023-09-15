function main() {
    // [START cloudtasks_v2beta3_generated_CloudTasks_CreateTask_async]
    // const { google } = require("googleapis");

    const credentialFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    // const scopes = ["https://www.googleapis.com/auth/drive.metadata.readonly"];
    
    // const auth = new google.auth.GoogleAuth({keyFile: credentialFilename, scopes: scopes});
    /**
     *  Required. The queue name. For example:
     *  `projects/PROJECT_ID/locations/LOCATION_ID/queues/QUEUE_ID`
     *  The queue must already exist.
     */
    const parent = '/projects/run-pix/locations/us-central1/queues/images/tasks/test'
    /**
     *  Required. The task to add.
     *  Task names have the following format:
     * projects/run-pix/locations/us-central1/queues/images/tasks/test
     *  `projects/PROJECT_ID/locations/LOCATION_ID/queues/QUEUE_ID/tasks/TASK_ID`.
     *  The user can optionally specify a task
     *  name google.cloud.tasks.v2beta3.Task.name. If a name is not specified
     *  then the system will generate a random unique task id, which will be set in
     *  the task returned in the response google.cloud.tasks.v2beta3.Task.name.
     *  If schedule_time google.cloud.tasks.v2beta3.Task.schedule_time  is not
     *  set or is in the past then Cloud Tasks will set it to the current time.
     *  Task De-duplication:
     *  Explicitly specifying a task ID enables task de-duplication.  If
     *  a task's ID is identical to that of an existing task or a task
     *  that was deleted or executed recently then the call will fail
     *  with ALREADY_EXISTS google.rpc.Code.ALREADY_EXISTS.
     *  If the task's queue was created using Cloud Tasks, then another task with
     *  the same name can't be created for ~1 hour after the original task was
     *  deleted or executed. If the task's queue was created using queue.yaml or
     *  queue.xml, then another task with the same name can't be created
     *  for ~9 days after the original task was deleted or executed.
     *  Because there is an extra lookup cost to identify duplicate task
     *  names, these CreateTask google.cloud.tasks.v2beta3.CloudTasks.CreateTask 
     *  calls have significantly increased latency. Using hashed strings for the
     *  task id or for the prefix of the task id is recommended. Choosing task ids
     *  that are sequential or have sequential prefixes, for example using a
     *  timestamp, causes an increase in latency and error rates in all
     *  task commands. The infrastructure relies on an approximately
     *  uniform distribution of task ids to store and serve tasks
     *  efficiently.
     */
    const task = {}
    /**
     *  The response_view specifies which subset of the
     *  Task google.cloud.tasks.v2beta3.Task  will be returned.
     *  By default response_view is
     *  BASIC google.cloud.tasks.v2beta3.Task.View.BASIC; not all information is
     *  retrieved by default because some data, such as payloads, might be
     *  desirable to return only when needed because of its large size or because
     *  of the sensitivity of data that it contains.
     *  Authorization for FULL google.cloud.tasks.v2beta3.Task.View.FULL 
     *  requires `cloudtasks.tasks.fullView` Google
     *  IAM (https://cloud.google.com/iam/) permission on the
     *  Task google.cloud.tasks.v2beta3.Task  resource.
     */
    // const responseView = {}
  
    // Imports the Tasks library
    const {CloudTasksClient} = require('@google-cloud/tasks').v2beta3;
  
    // Instantiates a client
    const tasksClient = new CloudTasksClient()
        // {"keyFilename": "/home/avinashmane/.config/firebase/serviceaccount.json"});

    console.log("xx")
    tasksClient.auth.getClient()
            .then(x=>x.getAccessToken()
                .then(y=>console.log("y",y)))

    async function callCreateTask() {

        // load the environment variable with our keys
        console.warn('create')
        // const keys = require('/home/avinashmane/.config/firebase/serviceaccount.json');


        // // load the JWT or UserRefreshClient from the keys
        // const client = tasksClient.auth.fromJSON(keys);
        // client.scopes = ['https://www.googleapis.com/auth/cloud-platform'];
        // const url = `https://dns.googleapis.com/dns/v1/projects/${keys.project_id}`;
        // const res = await client.request({url});
        // console.log(">>",res.data);
        
    
      // Construct request
      const request = {
        parent,
        task:{name:"name"},
      };
  
      // Run request
        try {
            const response = await tasksClient.createTask(request);
            console.log("x",response);
        } catch (e){ 
            console.error(e)
        }
    }
  
    callCreateTask();
    // [END cloudtasks_v2beta3_generated_CloudTasks_CreateTask_async]
  }
  
//   process.on('unhandledRejection', err => {
//     console.error(err.message);
//     process.exitCode = 1;
//   });
  main(...process.argv.slice(2));