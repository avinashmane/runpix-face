// Imports the Google Cloud Tasks library.
const {CloudTasksClient} = require('@google-cloud/tasks');

// Instantiates a client.
const client = new CloudTasksClient({"keyFilename": "/home/avinashmane/.config/firebase/serviceaccount.json"});

async function createHttpTaskWithToken() {
  // TODO(developer): Uncomment these lines and replace with your values.
  const project = 'run-pix';
  const queue = 'images';
  const location = 'us-central1';
  const url = 'https://example.com/taskhandler';
  const serviceAccountEmail = 'firebase-adminsdk-spqa9@run-pix.iam.gserviceaccount.com';
//   const payload = 'Hello, World!';

  // Construct the fully qualified queue name.
  const parent = client.queuePath(project, location, queue);

  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'text/plain', // Set content type to ensure compatibility your application's request parsing
      },
      httpMethod: 'GET',//'POST',
      url,
      oidcToken: {
        serviceAccountEmail,
      },
    },
  };

//   if (payload) {
//     task.httpRequest.body = Buffer.from(payload).toString('base64');
//   }

  console.log('Sending task:');
  console.log(task);
  // Send create task request.
  const request = {parent: parent, task: task};
  const [response] = await client.createTask(request);
  const name = response.name;
  console.log(`Created task ${name}`);
}
createHttpTaskWithToken();