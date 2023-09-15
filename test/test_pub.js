// Imports the Google Cloud client library
const {PubSub} = require('@google-cloud/pubsub');

async function quickstart(
  projectId = 'run-pix', // Your Google Cloud Platform project ID
  topicNameOrId = 'faceid', // Name for the new topic to create
  subscriptionName = 'faceid-processor' // Name for the new subscription to create
) { 

    try{
          // Instantiates a client 
        const pubsub = new PubSub({projectId});

        // Creates a new topic
        // const [topic] = await pubsub.createTopic(topicNameOrId);
        // console.log(`Topic ${topic.name} created.`);

        // // Creates a subscription on that new topic
        // const [subscription] = await topic.createSubscription(subscriptionName);

        const topic = pubsub.topic(topicNameOrId);
        const subscription = topic.subscription(subscriptionName);
        // `subscription` is a Subscription object.

        // Receive callbacks for new messages on the subscription
        subscription.on('message', message => {
            setTimeout(function() { 
                console.log('Received message:', message.data.toString());
                message.ack()
            }, 3000);
            // process.exit(0);
        });

        // Receive callbacks for errors on the subscription
        subscription.on('error', error => {
            console.error('Received error:', error);
            process.exit(1);
        });

        // Send a message to the topic

        for (let i=0;i<100;i++) {
            console.log(`sending ${i}`, i);

            topic.publishMessage({data: Buffer.from(`Test message! ${i}`)});
        }
    }
    catch (e){
        console.error(e)
    }
}

quickstart()