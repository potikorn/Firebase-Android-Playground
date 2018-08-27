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

        return getAllMemberInChatRoom(roomRefKey, uid)
            .then(members => {
                console.log("After then members : " + members);
                return getAllUsers(members);
            })
            .then(fcmTokenList => {
                console.log("After excuted getTokenList : " + fcmTokenList);
                return sendPayload(fcmTokenList, msg);
            });
    });

function getAllMemberInChatRoom(roomRefKey, uid) {
    return admin.database()
        .ref('chat-room')
        .child(roomRefKey)
        .child('members')
        .once('value')
        .then(snapShot => {
            var members = [];
            snapShot.forEach(element => {
                if (element.key !== uid)
                    members.push(element.key);
            });
            return members;
        });
}

function getAllUsers(members) {
    var fcmToken = [];
    return admin.database()
        .ref('playground-user')
        .once('value')
        .then(users => {
            users.forEach(user => {
                if (members.includes(user.key)) {
                    console.log(user.val());
                    if (user.child('fcm_token').val() !== null)
                        fcmToken.push(user.child('fcm_token').val());
                }
            });
            console.log(fcmToken);
            return fcmToken;
        });
}

function sendPayload(fcmTokenList, message) {
    const payload = {
        notification: {
            title: "มีข้อความใหม่",
            body: message
        }
    };
    var options = {
        priority: "high"
    };
    admin.messaging().sendToDevice(fcmTokenList, payload, options)
        .then(response => {
            return console.log("Successfully sent message:", response);
        })
        .catch(error => {
            console.log("Error sending message:", error);
        });
}