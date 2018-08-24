/*jshint esversion: 6 */
const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.onUserCreate = functions.auth.user().onCreate((user) => {

    return admin.database().ref('/playground-user/' + user.uid).set({
        username: user.displayName,
        email: user.email,
    });
});

exports.onUserDelete = functions.auth.user().onDelete((user) => {
    return admin.database().ref('/playground-user/' + user.uid).remove();
});

exports.sendNotification = functions.database.ref('chat-room/{pushId}/messages/{secondPushId}')
    .onWrite((change, context) => {
        const message = change.after.val();
        const roomRefKey = change.after.ref.parent.ref.parent.key;
        console.log(roomRefKey);
        const msg = message.text;
        const uid = message.user;
        console.log(msg + " " + uid);
        const promises = [];

        const allMembers = admin.database()
            .ref('chat-room')
            .child(roomRefKey)
            .child('members')
            .once('value');
        // const getReceiverUidPromise = admin.auth().getUser(uid);

        return allMembers.then(result => {
            var members;
            result.forEach(element => {
                console.log(element.key + " : " + element.val());
                if (element.key !== uid)
                    members.push(element.key);
            });
            console.log("members : " + members);
            members.forEach(memberUid => {
                admin.messaging().sendToDevice()
            });
            return null;
        });

        // return Promise.all([allMembers, getReceiverUidPromise]).then(results => {
        //     const instanceId = results[0].val();
        //     const receiver = results[1];
        //     console.log('notifying ' + uid + ' about ' + message.body + ' from ' + senderUid);


        // });

    });